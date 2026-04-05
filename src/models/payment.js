const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    paymentId: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true, // in paise — 99900 = ₹999
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
    plan: {
      type: String,
      enum: ["lifetime"],
      default: "lifetime",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
