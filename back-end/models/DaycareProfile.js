const mongoose = require("mongoose");
const daycareProfileSchema = new mongoose.Schema(
  {
user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
        },

    daycareName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    address: {
      type: String,
      required: true,
    },

    area: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    qualifications: [
      {
        type: String,
      },
    ],

    training: [
      {
        type: String,
      },
    ],

    experienceYears: {
      type: Number,
      default: 0,
    },

    services: [
      {
        type: String,
        enum: ["home", "facility"],
      },
    ],

    facilities: [
      {
        type: String,
      },
    ],

    cctv: {
      type: Boolean,
      default: false,
    },

    nursingFacilities: {
      type: Boolean,
      default: false,
    },

    nursingStaffCount: {
      type: Number,
      default: 0,
    },

    medicalStaffCount: {
      type: Number,
      default: 0,
    },

    images: [
      {
        type: String,
      },
    ],

    fee: {
      type: Number,
      required: true,
    },

    paymentOptions: [
      {
        type: String,
      },
    ],

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "needs-info"],
      default: "pending",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

daycareProfileSchema.index({ user: 1 }, { unique: true });

module.exports = daycareProfileSchema;
