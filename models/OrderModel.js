import mongoose from "mongoose"

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: { type: Number, default : 1 },
        price: { type: Number, required: true }
      }
    ], 

    totalAmount: { type: Number, required: true },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "preparing",
        "on-the-way",
        "delivered",
        "cancelled"
      ],
      default: "pending"
    },
  },
  { timestamps: true }
);

export const orderModel = mongoose.model("Order", orderSchema);
