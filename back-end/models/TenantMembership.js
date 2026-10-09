const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, required: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  role: { type: String, enum: ["manager", "caregiver", "nurse", "support"], required: true },
  permissions: { type: Map, of: [String], default: {} },
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true });
module.exports.index({ email: 1 }, { unique: true, name: "email_unique" });
