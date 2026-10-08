const mongoose = require("mongoose");

module.exports = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  ownerEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
  databaseName: { type: String, required: true, unique: true, match: /^daycare_[a-f0-9]{24}_db$/ },
  status: { type: String, enum: ["provisioning", "active", "suspended", "failed"], default: "provisioning" },
  listingStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });
