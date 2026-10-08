const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema(
  {
parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    daycare: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank", "jazzcash", "easypaisa"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    transactionId: {
      type: String,
    },

    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);



module.exports = paymentSchema;
