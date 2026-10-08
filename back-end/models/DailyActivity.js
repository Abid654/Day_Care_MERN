const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true, index: true },
  date: { type: Date, required: true, index: true },
  meals: { type: String, trim: true, maxlength: 1500 },
  snacks: { type: String, trim: true, maxlength: 1000 },
  nap: { type: String, trim: true, maxlength: 500 },
  toileting: { type: String, trim: true, maxlength: 500 },
  activities: { type: String, trim: true, maxlength: 2000 },
  mood: { type: String, enum: ["happy", "calm", "upset", "tired", "other"] },
  behavior: { type: String, trim: true, maxlength: 1500 },
  healthObservations: { type: String, trim: true, maxlength: 1500 },
  medication: { type: String, trim: true, maxlength: 1000 },
  notes: { type: String, trim: true, maxlength: 2000 },
  sharedWithParent: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
