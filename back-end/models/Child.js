const mongoose = require("mongoose");
const childSchema = new mongoose.Schema(
  {
parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    parentContact: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareParent" },
    profilePhoto: { type: String, trim: true },

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

    emergencyMedicalInformation: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    nationality: { type: String, trim: true },
    address: { type: String, trim: true },
    enrollmentDate: { type: Date, default: Date.now },
    assignedCaregiver: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    classGroup: { type: mongoose.Schema.Types.ObjectId, ref: "ClassGroup" },

    specialRequirements: {
      type: String,
    },

    specialNotes: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },

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



module.exports = childSchema;
