import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "userType" },
  userType: {
    type: String,
    required: true,
    enum: ["Client", "User"]
  },
  expireAt: { type: Date, required: true }
});

export const sessionModel = mongoose.model("Session", sessionSchema);
