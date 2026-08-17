require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const Razorpay = require('razorpay');
const bookingsStore = require('./lib/bookings-store');
const bookingToken = require('./lib/booking-token');

const app = express();
const PORT = process.env.PORT || 3000;

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const staticDir = path.join(__dirname, 'static');
const hasStaticDir = require('fs').existsSync(staticDir);
const publicDir = hasStaticDir ? staticDir : __dirname;

const VALID_SESSION_KEYS = new Set(['15min', '30min', '50min']);

let razorpay = null;

if (!keyId || !keySecret) {
  console.error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment.');
} else {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
  console.log('Razorpay configured for key:', keyId.slice(0, 12) + '...');
}

console.log('Bookings storage mode:', bookingsStore.storageMode());

if (process.env.AWS_EXECUTION_ENV && bookingsStore.storageMode() === 'local') {
  console.warn('WARNING: BOOKINGS_TABLE_NAME is not set. Booking records will not persist across requests in production.');
}

function paymentNotConfigured(res) {
  return res.status(503).json({ error: 'Payment service is not configured on the server.' });
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function bookingStatusResponse(record, token) {
  return {
    status: record.status,
    session_key: record.session_key,
    payment_id: record.payment_id,
    booking_token: token || null,
    expires_at: record.expires_at * 1000
  };
}

async function resolveBookingFromRequest(req) {
  const token = getBearerToken(req) || req.query.token || req.body.booking_token;
  const paymentId = req.query.payment_id || req.body.payment_id;

  if (token) {
    const payload = bookingToken.verifyBookingToken(token);
    if (!payload || bookingToken.isTokenExpired(payload)) return null;

    const record = await bookingsStore.getBooking(payload.payment_id);
    if (!record) return null;
    return { record: record, token: token };
  }

  if (paymentId) {
    const record = await bookingsStore.getBooking(paymentId);
    if (!record) return null;
    const freshToken = bookingToken.createBookingToken(record.payment_id, record.session_key);
    return { record: record, token: freshToken };
  }

  return null;
}

async function recoverBookingFromRazorpay(paymentId) {
  if (!razorpay || !paymentId) return null;

  const payment = await razorpay.payments.fetch(paymentId);
  if (!payment || payment.status !== 'captured') return null;

  const existing = await bookingsStore.getBooking(paymentId);
  if (existing) return existing;

  const order = await razorpay.orders.fetch(payment.order_id);
  const sessionKey = order.notes && order.notes.session_key;
  if (!sessionKey || !VALID_SESSION_KEYS.has(sessionKey)) return null;

  return bookingsStore.saveBooking(paymentId, sessionKey, 'pending_booking');
}

app.use(express.json({
  verify: function (req, res, buf) {
    if (req.originalUrl === '/api/razorpay-webhook') {
      req.rawBody = buf;
    }
  }
}));

app.get('/api/config', function (req, res) {
  if (!keyId) return paymentNotConfigured(res);
  res.json({ keyId: keyId });
});

app.post('/api/create-order', async function (req, res) {
  if (!razorpay) return paymentNotConfigured(res);

  const amount = Number(req.body.amount);
  const currency = req.body.currency || 'INR';
  const receipt = req.body.receipt;
  const sessionKey = req.body.session_key;

  if (!Number.isFinite(amount) || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise' });
  }

  if (!receipt || typeof receipt !== 'string') {
    return res.status(400).json({ error: 'Receipt is required' });
  }

  if (!sessionKey || !VALID_SESSION_KEYS.has(sessionKey)) {
    return res.status(400).json({ error: 'Valid session type is required' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: currency,
      receipt: receipt,
      notes: { session_key: sessionKey }
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err) {
    const statusCode = err.statusCode || err.status;

    if (statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed' });
    }

    console.error('Create order error:', err.error || err.message || err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post('/api/verify-payment', async function (req, res) {
  if (!keySecret || !razorpay) return paymentNotConfigured(res);

  const orderId = req.body.razorpay_order_id;
  const paymentId = req.body.razorpay_payment_id;
  const signature = req.body.razorpay_signature;

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ success: false, error: 'Missing payment verification fields' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(orderId + '|' + paymentId)
    .digest('hex');

  if (expectedSignature !== signature) {
    return res.status(400).json({ success: false, error: 'Invalid payment signature' });
  }

  try {
    const order = await razorpay.orders.fetch(orderId);
    const sessionKey = order.notes && order.notes.session_key;

    if (!sessionKey || !VALID_SESSION_KEYS.has(sessionKey)) {
      return res.status(400).json({ success: false, error: 'Could not determine session type for this payment.' });
    }

    const existing = await bookingsStore.getBooking(paymentId);
    let record = existing;

    if (!existing) {
      record = await bookingsStore.saveBooking(paymentId, sessionKey, 'pending_booking');
    } else if (existing.status === 'pending_booking') {
      record = existing;
    } else if (existing.status === 'completed') {
      return res.status(409).json({
        success: false,
        error: 'This payment has already been used to book a session.'
      });
    }

    const token = bookingToken.createBookingToken(paymentId, sessionKey);

    res.json({
      success: true,
      payment_id: paymentId,
      session_key: sessionKey,
      booking_token: token,
      status: record.status
    });
  } catch (err) {
    console.error('Verify payment error:', err.error || err.message || err);
    res.status(500).json({ success: false, error: 'Payment verified but booking could not be saved. Please contact support with your payment ID.' });
  }
});

app.get('/api/booking-status', async function (req, res) {
  try {
    const resolved = await resolveBookingFromRequest(req);
    if (!resolved) {
      return res.status(404).json({ error: 'No active booking found for this payment.' });
    }

    const { record, token } = resolved;

    if (record.status === 'completed') {
      return res.json(bookingStatusResponse(record, null));
    }

    if (!bookingsStore.isBookingActive(record)) {
      return res.status(410).json({ error: 'This booking window has expired. Please contact support.' });
    }

    res.json(bookingStatusResponse(record, token));
  } catch (err) {
    console.error('Booking status error:', err.message || err);
    res.status(500).json({ error: 'Could not load booking status.' });
  }
});

app.post('/api/recover-booking', async function (req, res) {
  if (!razorpay) return paymentNotConfigured(res);

  const paymentId = (req.body.payment_id || '').trim();
  if (!paymentId) {
    return res.status(400).json({ error: 'Payment ID is required.' });
  }

  try {
    let record = await bookingsStore.getBooking(paymentId);

    if (!record) {
      record = await recoverBookingFromRazorpay(paymentId);
    }

    if (!record) {
      return res.status(404).json({ error: 'No successful payment found with that ID.' });
    }

    if (record.status === 'completed') {
      return res.status(409).json({ error: 'This payment has already been used to book a session.' });
    }

    if (!bookingsStore.isBookingActive(record)) {
      return res.status(410).json({ error: 'This booking window has expired. Please contact support on WhatsApp.' });
    }

    const token = bookingToken.createBookingToken(record.payment_id, record.session_key);

    res.json({
      success: true,
      ...bookingStatusResponse(record, token)
    });
  } catch (err) {
    console.error('Recover booking error:', err.error || err.message || err);
    res.status(500).json({ error: 'Could not recover booking. Please try again or contact support.' });
  }
});

app.post('/api/complete-booking', async function (req, res) {
  try {
    const resolved = await resolveBookingFromRequest(req);
    if (!resolved) {
      return res.status(404).json({ error: 'No active booking found.' });
    }

    const { record } = resolved;

    if (record.status === 'completed') {
      return res.json({ success: true, status: 'completed' });
    }

    if (!bookingsStore.isBookingActive(record)) {
      return res.status(410).json({ error: 'This booking window has expired.' });
    }

    await bookingsStore.completeBooking(record.payment_id);
    res.json({ success: true, status: 'completed' });
  } catch (err) {
    console.error('Complete booking error:', err.message || err);
    res.status(500).json({ error: 'Could not complete booking.' });
  }
});

app.post('/api/razorpay-webhook', async function (req, res) {
  if (!keySecret || !razorpay) return res.status(503).send('not configured');

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret && req.rawBody) {
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (req.headers['x-razorpay-signature'] !== expected) {
      return res.status(400).send('invalid signature');
    }
  }

  const event = req.body && req.body.event;
  const paymentEntity = req.body && req.body.payload && req.body.payload.payment
    && req.body.payload.payment.entity;

  if (event === 'payment.captured' && paymentEntity && paymentEntity.id) {
    try {
      const existing = await bookingsStore.getBooking(paymentEntity.id);
      if (!existing) {
        await recoverBookingFromRazorpay(paymentEntity.id);
      }
    } catch (err) {
      console.error('Webhook booking save error:', err.message || err);
    }
  }

  res.json({ status: 'ok' });
});

app.use(express.static(publicDir));

app.listen(PORT, function () {
  console.log('Server running on port ' + PORT);
});
