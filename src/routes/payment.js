const express = require("express");
const paymentRouter = express.Router();

const { auth } = require("../middlewares/auth");
const getRazorpay = require("../config/razorpay");
const Payment = require("../models/payment");
const User = require("../models/user");

// POST /api/payment/order — create a Razorpay order for lifetime membership
paymentRouter.post("/order", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.isPremium) {
      return res.status(400).json({ error: "You are already a premium member" });
    }

    const order = await getRazorpay().orders.create({
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

// GET /api/payment/verify — check if logged-in user is premium
paymentRouter.get("/verify", auth, async (req, res) => {
  try {
    res.status(200).json({ isPremium: req.user.isPremium });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/webhook — Razorpay server-to-server webhook (backup)
paymentRouter.post("/webhook", async (req, res) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];

    const isValid = getRazorpay().validateWebhookSignature(
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isValid) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;
    console.log("[webhook] event received:", event.event);

    if (event.event === "payment.captured") {
      const { order_id, id: payment_id } = event.payload.payment.entity;
      console.log("[webhook] payment captured — order:", order_id, "payment:", payment_id);

      const payment = await Payment.findOneAndUpdate(
        { orderId: order_id },
        { paymentId: payment_id, status: "paid" },
        { new: true }
      );

      if (payment) {
        await User.findByIdAndUpdate(payment.userId, { isPremium: true });
        console.log("[webhook] isPremium set for user:", payment.userId);
      }
    }

    if (event.event === "payment.failed") {
      const { order_id, id: payment_id } = event.payload.payment.entity;
      console.log("[webhook] payment failed — order:", order_id);

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
