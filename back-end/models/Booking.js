const mongoose = require("mongoose");
const bookingSchema = new mongoose.Schema(
  {
parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    parentContact: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareParent" },

    daycare: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
    },

    childName: { type: String, trim: true, maxlength: 100 },
    childDateOfBirth: { type: Date },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
    },

    supportType: {
      type: String,
      enum: ["full-time", "part-time"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },

    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);



module.exports = bookingSchema;
