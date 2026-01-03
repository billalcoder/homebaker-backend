import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema(
  {
    // Main error info
    message: {
      type: String,
      required: true,
    },

    stack: {
      type: String, // error.stack
    },

    // API info
    route: {
      type: String, // /profile/update
    },

    method: {
      type: String, // POST / PUT
    },

    statusCode: {
      type: Number, // 400 / 401 / 500
    },

    // User info (if logged in)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    email: {
      type: String,
    },

    // Device & client info (VERY IMPORTANT FOR YOUR ISSUE)
    userAgent: {
      type: String, // mobile browser info
    },

    platform: {
      type: String, // Android / iOS / Web
    },

    ip: {
      type: String,
    },

    // Request data (careful, don't store passwords)
    requestBody: {
      type: Object,
    },

    // Custom tag
    source: {
      type: String, // frontend / backend / auth / upload
      default: "backend",
    },
  },
  { timestamps: true }
);

export const ErrorLog = mongoose.model("ErrorLog", errorLogSchema);

