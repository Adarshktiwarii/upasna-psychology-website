require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const Razorpay = require('razorpay');

const app = express();
const PORT = process.env.PORT || 3000;

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment.');
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

app.use(express.json());

app.get('/api/config', function (req, res) {
  res.json({ keyId: keyId });
});

app.post('/api/create-order', async function (req, res) {
  const amount = Number(req.body.amount);
  const currency = req.body.currency || 'INR';
  const receipt = req.body.receipt;

  if (!Number.isFinite(amount) || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise' });
  }

  if (!receipt || typeof receipt !== 'string') {
    return res.status(400).json({ error: 'Receipt is required' });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: currency,
      receipt: receipt
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

app.post('/api/verify-payment', function (req, res) {
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

  res.json({ success: true, payment_id: paymentId });
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, function () {
  console.log('Server running at http://localhost:' + PORT);
});
