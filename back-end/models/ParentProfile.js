const mongoose = require("mongoose");

const parentProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        address: {
            type: String,
            required: true,
        },

        emergencyContactName: {
            type: String,
            required: true,
        },

        emergencyContactNumber: {
            type: String,
            required: true,
        },

        emergencyContactDetails: {
            type: String,
        },

        childSupportType: {
            type: String,
            enum: ["full-time", "part-time"],
            required: true,
        },

        area: {
            type: String,
            required: true,
        },

        requiredStartTime: {
            type: String,
        },

        requiredEndTime: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("ParentProfile", parentProfileSchema);