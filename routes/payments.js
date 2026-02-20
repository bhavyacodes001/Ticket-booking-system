const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const { auth } = require('../middleware/auth');
const { sendBookingConfirmation } = require('../utils/email');
const { generateQRCode } = require('../utils/ticket');
const { dummyBookings } = require('./bookings');

const router = express.Router();

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
} else {
  console.warn('WARNING: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set. Payment endpoints will return errors.');
}

const requireRazorpay = (req, res, next) => {
  if (!razorpay) {
    return res.status(503).json({ message: 'Payment service unavailable. Razorpay is not configured.' });
  }
  next();
};

async function findBooking(bookingId, populateFields) {
  if (bookingId.startsWith('booking_')) {
    return { booking: dummyBookings.get(bookingId) || null, isDummy: true };
  }
  const booking = await Booking.findById(bookingId).populate(populateFields);
  return { booking, isDummy: false };
}

// @route   POST /api/payments/create-order
// @desc    Create Razorpay order for a booking
// @access  Private
router.post('/create-order', auth, requireRazorpay, [
  body('bookingId').isString().notEmpty().withMessage('Booking ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { bookingId } = req.body;

    const { booking, isDummy } = await findBooking(bookingId, [
      { path: 'user', select: 'firstName lastName email' },
      { path: 'movie', select: 'title' },
      { path: 'theater', select: 'name' }
    ]);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const bookingUserId = isDummy ? String(booking.user) : booking.user._id.toString();
    if (bookingUserId !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking is not in pending status' });
    }

    const amountInPaise = Math.round(booking.totalAmount * 100);

    const movieTitle = booking.movie?.title || 'Movie';
    const theaterName = booking.theater?.name || 'Theater';

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: booking.bookingNumber,
      notes: {
        bookingId,
        userId: req.user.userId,
        movieTitle,
        theaterName
      }
    });

    if (isDummy) {
      booking.payment.razorpayOrderId = order.id;
    } else {
      booking.payment.razorpayOrderId = order.id;
      await booking.save();
    }

    const userName = isDummy
      ? 'Customer'
      : `${booking.user.firstName} ${booking.user.lastName}`;
    const userEmail = isDummy ? '' : booking.user.email;

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId,
      bookingNumber: booking.bookingNumber,
      prefill: { name: userName, email: userEmail }
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ message: 'Server error while creating payment order' });
  }
});

// @route   POST /api/payments/verify-payment
// @desc    Verify Razorpay payment signature and confirm booking
// @access  Private
router.post('/verify-payment', auth, [
  body('razorpay_order_id').isString().withMessage('Order ID is required'),
  body('razorpay_payment_id').isString().withMessage('Payment ID is required'),
  body('razorpay_signature').isString().withMessage('Signature is required'),
  body('bookingId').isString().notEmpty().withMessage('Booking ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    const { booking, isDummy } = await findBooking(bookingId, [
      { path: 'showtime' },
      { path: 'user', select: 'firstName lastName email' }
    ]);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const bookingUserId = isDummy ? String(booking.user) : booking.user._id.toString();
    if (bookingUserId !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (isDummy) {
      booking.status = 'confirmed';
      booking.payment.status = 'completed';
      booking.payment.transactionId = razorpay_payment_id;
      booking.payment.razorpayPaymentId = razorpay_payment_id;
      booking.payment.razorpaySignature = razorpay_signature;
      booking.payment.paidAt = new Date();

      res.json({ message: 'Payment verified and booking confirmed', booking });
    } else {
      booking.status = 'confirmed';
      booking.payment.status = 'completed';
      booking.payment.transactionId = razorpay_payment_id;
      booking.payment.razorpayPaymentId = razorpay_payment_id;
      booking.payment.razorpaySignature = razorpay_signature;
      booking.payment.paidAt = new Date();

      booking.qrCode = await generateQRCode({
        bookingNumber: booking.bookingNumber,
        movie: booking.showtime?.movie || bookingId,
        seats: booking.tickets.map(t => `${t.seat.row}${t.seat.number}`),
        showDate: booking.showDate,
        showTime: booking.showTime
      });

      await booking.save();

      await booking.populate([
        { path: 'movie', select: 'title poster' },
        { path: 'theater', select: 'name' },
        { path: 'user', select: 'firstName lastName email' }
      ]);
      sendBookingConfirmation(booking).catch(err => console.error('Confirmation email failed:', err.message));
      booking.notifications.bookingConfirmation = { sent: true, sentAt: new Date() };
      await booking.save();

      res.json({ message: 'Payment verified and booking confirmed', booking });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error while verifying payment' });
  }
});

// @route   POST /api/payments/refund
// @desc    Process refund for cancelled booking
// @access  Private
router.post('/refund', auth, requireRazorpay, [
  body('bookingId').isMongoId().withMessage('Valid booking ID is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { bookingId, amount } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('user', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!booking.cancellation.isCancelled) {
      return res.status(400).json({ message: 'Booking is not cancelled' });
    }

    if (booking.cancellation.refundStatus === 'processed') {
      return res.status(400).json({ message: 'Refund already processed' });
    }

    const refundAmount = amount || booking.cancellation.refundAmount;
    if (refundAmount <= 0) {
      return res.status(400).json({ message: 'No refund amount available' });
    }

    const paymentId = booking.payment.razorpayPaymentId || booking.payment.transactionId;
    if (!paymentId) {
      return res.status(400).json({ message: 'No payment ID found for refund' });
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(refundAmount * 100),
      notes: { bookingId, reason: 'booking_cancellation' }
    });

    booking.cancellation.refundStatus = 'processed';
    booking.cancellation.refundTransactionId = refund.id;
    await booking.save();

    res.json({
      message: 'Refund processed successfully',
      refund: { id: refund.id, amount: refundAmount, status: refund.status }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Server error while processing refund' });
  }
});

// @route   GET /api/payments/payment-methods
// @desc    Get available payment methods
// @access  Public
router.get('/payment-methods', (req, res) => {
  res.json({
    paymentMethods: [
      { id: 'upi', name: 'UPI', description: 'Google Pay, PhonePe, Paytm', icon: 'qr-code' },
      { id: 'card', name: 'Credit/Debit Card', description: 'Visa, Mastercard, RuPay', icon: 'credit-card' },
      { id: 'netbanking', name: 'Net Banking', description: 'All major banks', icon: 'bank' },
      { id: 'wallet', name: 'Wallets', description: 'Paytm, PhonePe, Amazon Pay', icon: 'smartphone' }
    ]
  });
});

// @route   POST /api/payments/webhook
// @desc    Razorpay webhook handler
// @access  Public (Razorpay webhook)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(200).json({ received: true });
  }

  const signature = req.headers['x-razorpay-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('Webhook signature verification failed');
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    try {
      const booking = await Booking.findOne({ 'payment.razorpayOrderId': payment.order_id });
      if (booking && booking.status === 'pending') {
        booking.status = 'confirmed';
        booking.payment.status = 'completed';
        booking.payment.transactionId = payment.id;
        booking.payment.paidAt = new Date();
        await booking.save();
      }
    } catch (error) {
      console.error('Error updating booking from webhook:', error);
    }
  }

  res.json({ received: true });
});

// @route   GET /api/payments/booking/:bookingId/status
// @desc    Get payment status for a booking
// @access  Private
router.get('/booking/:bookingId/status', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .select('payment status bookingNumber user');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      paymentStatus: booking.payment.status,
      paidAt: booking.payment.paidAt
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid booking ID' });
    }
    res.status(500).json({ message: 'Server error while fetching payment status' });
  }
});

// @route   GET /api/payments/config
// @desc    Get Razorpay public key for frontend
// @access  Public
router.get('/config', (req, res) => {
  res.json({
    keyId: razorpayKeyId || null,
    configured: !!razorpay
  });
});

module.exports = router;
