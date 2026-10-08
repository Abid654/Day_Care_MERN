const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  relationship: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  identificationNumber: { type: String, trim: true, maxlength: 100 },
  photo: { type: String, trim: true },
  authorized: { type: Boolean, default: true, index: true },
  notes: { type: String, trim: true, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
