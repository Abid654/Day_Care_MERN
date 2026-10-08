const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, required: true, trim: true, maxlength: 100 },
  module: { type: String, required: true, trim: true, maxlength: 80, index: true },
  record: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, trim: true, maxlength: 80 },
}, { timestamps: true });
