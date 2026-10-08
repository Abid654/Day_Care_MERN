const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  attachment: { type: String, trim: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  audience: { type: String, enum: ["all", "parents", "staff", "class"], default: "all" },
  classGroup: { type: mongoose.Schema.Types.ObjectId, ref: "ClassGroup" },
  status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
