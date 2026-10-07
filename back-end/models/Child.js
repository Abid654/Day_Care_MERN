const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    medicalInformation: {
      type: String,
    },

    allergies: {
      type: String,
    },

    specialRequirements: {
      type: String,
    },

    emergencyContactName: {
      type: String,
    },

    emergencyContactNumber: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Child", childSchema);