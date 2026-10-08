const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true, index: true },
  date: { type: Date, required: true, index: true },
  status: { type: String, enum: ["present", "absent", "late", "leave"], default: "present" },
  checkIn: Date,
  checkOut: Date,
  notes: { type: String, trim: true, maxlength: 1000 },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
