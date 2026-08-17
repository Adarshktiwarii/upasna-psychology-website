const crypto = require('crypto');

const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000;

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64url(value) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function getSecret() {
  return process.env.BOOKING_TOKEN_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
}

function signBookingToken(payload) {
  const secret = getSecret();
  if (!secret) throw new Error('Booking token secret is not configured');

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(header + '.' + body)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return header + '.' + body + '.' + signature;
}

function verifyBookingToken(token) {
  const secret = getSecret();
  if (!secret || !token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(header + '.' + body)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    return JSON.parse(decodeBase64url(body));
  } catch (err) {
    return null;
  }
}

function createBookingToken(paymentId, sessionKey) {
  const now = Date.now();
  return signBookingToken({
    payment_id: paymentId,
    session_key: sessionKey,
    iat: now,
    exp: now + DEFAULT_TTL_MS
  });
}

function isTokenExpired(payload) {
  return !payload || !payload.exp || Date.now() > payload.exp;
}

module.exports = {
  createBookingToken,
  verifyBookingToken,
  isTokenExpired,
  DEFAULT_TTL_MS
};
