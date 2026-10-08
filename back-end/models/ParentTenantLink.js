const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  parentUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  daycareParent: { type: mongoose.Schema.Types.ObjectId, required: true },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

schema.index({ tenant: 1, email: 1 }, { unique: true });
schema.index({ parentUser: 1, isActive: 1 });

module.exports = schema;
