import mongoose from "mongoose"

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export const cartModel = mongoose.model("Cart", cartSchema);
