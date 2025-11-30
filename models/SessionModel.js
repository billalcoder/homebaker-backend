import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true ,  ref: "Client" },
  expireAt: { type: Date, required: true }
});

export const sessionModel = mongoose.model("Session", sessionSchema);
