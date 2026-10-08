const mongoose = require("mongoose");
const reviewSchema = new mongoose.Schema(
  {
reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    daycare: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      required: true,
    },

    reviewType: {
      type: String,
      enum: ["daycare", "child"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);



module.exports = reviewSchema;
