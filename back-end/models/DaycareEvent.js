const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, maxlength: 3000 },
  date: { type: Date, required: true, index: true },
  startTime: { type: String, trim: true },
  endTime: { type: String, trim: true },
  location: { type: String, trim: true, maxlength: 300 },
  audience: { type: String, enum: ["everyone", "parents", "staff", "class"], default: "everyone" },
  classGroup: { type: mongoose.Schema.Types.ObjectId, ref: "ClassGroup" },
  reminderAt: Date,
  status: { type: String, enum: ["scheduled", "cancelled", "completed"], default: "scheduled", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
