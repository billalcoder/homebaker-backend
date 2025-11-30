import mongoose from "mongoose"

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  otp: { type: String, required: true },
  expireAt: { type: Date, required: true }
});

export const otpModel = mongoose.model("Otp", otpSchema);
