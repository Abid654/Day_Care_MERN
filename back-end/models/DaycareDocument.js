const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  category: { type: String, enum: ["child", "parent", "staff", "certificate", "other"], default: "other" },
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareParent" },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
  fileUrl: { type: String, trim: true },
  storageKey: { type: String, select: false },
  mimeType: { type: String, trim: true },
  fileSize: { type: Number, min: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
