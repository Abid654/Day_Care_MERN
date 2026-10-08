const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 1000 },
  minAgeMonths: { type: Number, min: 0, default: 0 },
  maxAgeMonths: { type: Number, min: 0, default: 72 },
  capacity: { type: Number, required: true, min: 1 },
  assignedCaregiver: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: "Child" }],
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
