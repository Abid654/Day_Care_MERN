const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  complaintNumber: { type: String, required: true, trim: true, unique: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareParent" },
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  status: { type: String, enum: ["pending", "in-progress", "resolved", "rejected"], default: "pending", index: true },
  response: { type: String, trim: true, maxlength: 5000 },
  internalNotes: { type: String, trim: true, maxlength: 5000 },
  history: [{ status: String, note: String, changedBy: mongoose.Schema.Types.ObjectId, changedAt: { type: Date, default: Date.now } }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
