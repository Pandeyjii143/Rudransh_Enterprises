const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { dbAsync } = require('../config/database');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_example',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'example_secret',
});

// Create Razorpay order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: { message: 'orderId is required' } });
    }

    const order = await dbAsync.get(
      'SELECT id, total_price, user_id FROM orders WHERE id = ?',
      [orderId],
    );

    if (!order) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }

    if (req.user.role !== 'admin' && order.user_id !== req.user.userId) {
      return res.status(403).json({ error: { message: 'You are not allowed to access this order' } });
    }

    const amount = Math.round(Number(order.total_price) * 100);
    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: { message: 'Invalid order amount' } });
    }

    const mockOrder = {
      id: `order_${uuidv4()}`,
      amount,
      currency: 'INR',
      receipt: orderId.toString(),
    };

    res.json({
      orderId: mockOrder.id,
      amount: mockOrder.amount,
      currency: mockOrder.currency,
      receipt: mockOrder.receipt,
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Verify Razorpay signature
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: { message: 'Missing verification payload' } });
    }

    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || 'example_secret';
    const generatedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: { message: 'Invalid payment signature' } });
    }

    const order = await dbAsync.get('SELECT total_amount FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }

    await dbAsync.run(
      'INSERT INTO payments (id, order_id, payment_provider_id, payment_method, status, amount, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), orderId, razorpay_payment_id, 'razorpay', 'paid', order.total_amount, 'INR'],
    );

    await dbAsync.run(
      'UPDATE orders SET status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['confirmed', 'paid', orderId],
    );

    await dbAsync.run(
      `INSERT OR IGNORE INTO deliveries (id, order_id, tracking_number, status, carrier, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [uuidv4(), orderId, `TRACK-${Date.now()}`, 'pending', 'Rudransh Logistics'],
    );

    const delivery = await dbAsync.get('SELECT id, order_id FROM deliveries WHERE order_id = ?', [orderId]);
    if (delivery) {
      await dbAsync.run(
        'INSERT INTO tracking_updates (delivery_id, status, location, description) VALUES (?, ?, ?, ?)',
        [delivery.id, 'confirmed', 'Warehouse', 'Payment verified and order confirmed.'],
      );
    }

    if (req.io) {
      req.io.to(`order-${orderId}`).emit('tracking-update', {
        orderId,
        status: 'confirmed',
      });
    }

    res.json({ success: true, message: 'Payment verified and order updated' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

module.exports = router;
