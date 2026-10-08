const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  type: { type: String, enum: ["announcement", "fee-reminder", "attendance", "holiday", "emergency", "event", "child-update", "general"], default: "general" },
  audience: { type: String, enum: ["all-parents", "parent", "class", "child", "staff", "staff-member", "all"], default: "all-parents" },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareParent" },
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
  staffMember: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  classGroup: { type: mongoose.Schema.Types.ObjectId, ref: "ClassGroup" },
  status: { type: String, enum: ["draft", "sent", "archived"], default: "sent", index: true },
  sentAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
