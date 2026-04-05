const express = require("express");
const paymentRouter = express.Router();

const { auth } = require("../middlewares/auth");
const razorpay = require("../config/razorpay");
const Payment = require("../models/payment");
const User = require("../models/user");

// POST /api/payment/order — create a Razorpay order for lifetime membership
paymentRouter.post("/order", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.isPremium) {
      return res.status(400).json({ error: "You are already a premium member" });
    }

    const order = await razorpay.orders.create({
      amount: 99900, // ₹999 in paise
      currency: "INR",
      receipt: `rcpt_${userId.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: userId.toString(),
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.emailId,
        plan: "lifetime",
      },
    });

    await Payment.create({
      userId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: "lifetime",
      status: "created",
    });

    res.status(201).json({
      key_id: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "Devhive",
      description: "Lifetime Premium Membership",
      prefill: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.emailId,
      },
      notes: order.notes,
    });
  } catch (err) {
    console.error("[payment/order error]", err);
    res.status(500).json({ error: err.message, details: err.error || null });
  }
});

// POST /api/payment/verify — verify payment signature and activate premium
paymentRouter.post("/verify", auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment details" });
    }

    // Verify signature using Razorpay's built-in method
    const isValid = razorpay.validatePaymentSignature(
      { razorpay_order_id, razorpay_payment_id },
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Mark payment as paid
    await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { paymentId: razorpay_payment_id, status: "paid" }
    );

    // Activate lifetime premium on user
    await User.findByIdAndUpdate(req.user._id, { isPremium: true });

    res.status(200).json({ message: "Payment verified. Welcome to Premium!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/webhook — Razorpay server-to-server webhook (backup)
paymentRouter.post("/webhook", async (req, res) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];

    const isValid = razorpay.validateWebhookSignature(
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;

    if (event.event === "payment.captured") {
      const { order_id, id: payment_id } = event.payload.payment.entity;

      const payment = await Payment.findOneAndUpdate(
        { orderId: order_id },
        { paymentId: payment_id, status: "paid" },
        { new: true }
      );

      if (payment) {
        await User.findByIdAndUpdate(payment.userId, { isPremium: true });
      }
    }

    if (event.event === "payment.failed") {
      const { order_id, id: payment_id } = event.payload.payment.entity;

      await Payment.findOneAndUpdate(
        { orderId: order_id },
        { paymentId: payment_id, status: "failed" }
      );
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = paymentRouter;
