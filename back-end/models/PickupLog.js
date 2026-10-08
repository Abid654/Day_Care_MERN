const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true, index: true },
  pickupPerson: { type: mongoose.Schema.Types.ObjectId, ref: "PickupAuthorization" },
  pickupName: { type: String, required: true, trim: true, maxlength: 100 },
  eventType: { type: String, enum: ["pickup", "dropoff"], required: true },
  occurredAt: { type: Date, default: Date.now, index: true },
  verified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: { type: String, trim: true, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
