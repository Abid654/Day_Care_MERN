const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, required: true },
  parentUser: { type: mongoose.Schema.Types.ObjectId },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  profilePhoto: { type: String, trim: true },
  address: { type: String, trim: true, maxlength: 500 },
  emergencyContactName: { type: String, trim: true, maxlength: 100 },
  emergencyContactPhone: { type: String, trim: true, maxlength: 30 },
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
