const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
  name: { type: String, required: [true, "Name is required"], trim: true, minlength: [2, "Name must be at least 2 characters"], maxlength: [50, "Name cannot exceed 50 characters"] },
  email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, "Password is required"], minlength: [6, "Password must be at least 6 characters"] },
  phone: { type: String, required: [true, "Phone number is required"], trim: true },
  profilePhoto: { type: String, trim: true },
  address: { type: String, trim: true, maxlength: 500 },
  area: { type: String, trim: true, maxlength: 120 },
  emergencyContactName: { type: String, trim: true, maxlength: 100 },
  emergencyContactPhone: { type: String, trim: true, maxlength: 30 },
  emergencyContactRelationship: { type: String, trim: true, maxlength: 80 },
  emergencyContactDetails: { type: String, trim: true, maxlength: 500 },
  childcareType: { type: String, enum: ["full-time", "part-time"] },
  careStartTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  careEndTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  role: { type: String, enum: { values: ["parent", "daycare", "admin", "manager", "caregiver", "nurse", "support"], message: "Role is invalid" }, required: [true, "Role is required"] },
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });
