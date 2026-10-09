const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  ownerEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
  databaseName: { type: String, required: true, unique: true, match: /^daycare_[a-f0-9]{24}_db$/ },
  userLimit: { type: Number, min: 10, default: 10 },
  status: { type: String, enum: ["provisioning", "active", "suspended", "inactive", "failed"], default: "provisioning" },
  listingStatus: { type: String, enum: ["pending", "approved", "rejected", "needs-info"], default: "pending" },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId },
  rejectionReason: { type: String, trim: true, maxlength: 2000 },
  adminRemarks: { type: String, trim: true, maxlength: 2000 },
  statusHistory: [{
    status: { type: String, required: true },
    reason: { type: String, trim: true, maxlength: 2000 },
    changedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    changedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });
