const mongoose = require("mongoose");
module.exports = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, trim: true, unique: true },
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true, index: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareParent" },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  amount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  dueDate: { type: Date, required: true, index: true },
  paidAt: Date,
  paymentMethod: { type: String, enum: ["cash", "card", "bank", "jazzcash", "easypaisa", "other"] },
  transactionReference: { type: String, trim: true, maxlength: 120 },
  status: { type: String, enum: ["pending", "partially-paid", "paid", "overdue"], default: "pending", index: true },
  notes: { type: String, trim: true, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
