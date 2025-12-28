import mongoose from "mongoose"

const otpSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true, trim: true },
  otp: { type: String, required: true },
  expireAt: { type: Date, required: true }
});

export const otpModel = mongoose.model("Otp", otpSchema);
