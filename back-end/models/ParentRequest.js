const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareParent" },
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
  requestType: { type: String, enum: ["pickup-dropoff", "information-update", "schedule", "document", "other"], required: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending", index: true },
  adminRemarks: { type: String, trim: true, maxlength: 1000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
