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
          required: false
        },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: false }
      }
    ],

    customization: {
      weight: { type: String }, // e.g., "1kg", "2kg"
      flavor: { type: String }, // e.g., "Chocolate"
      theme: { type: String },  // e.g., "Birthday"
      notes: { type: String }   // e.g., "Write 'Happy Birthday John'"
    },

    totalAmount: { type: Number, required: true, default: 0 },

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
