import mongoose from "mongoose";
import { type } from "os";
import { ref } from "process";

const productSchema = new mongoose.Schema(
  {
    // Link to the Shop (Client) who owns this product
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    productName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },

    productDescription: {
      type: String,
      trim: true,
      default: ""
    },

    price: {
      type: Number,
      required: true,
      min: 1
    },

    // Array of CloudFront Image URLs
    images: {
      type: [String],
      default: []
    },

    stock: {
      type: Number,
      default: 10,
      min: 0
    },

    unitType: {
      type: String,
      enum: ["kg", "quantity"],
      required: true
    },
    unitValue: {
      type: Number,
      required: true,
      min: 1
    },

    category: {
      type: String,
      trim: true,
      enum: ["Cake", "Pastry", "Cookies", "Bread", "Brownie", "Donuts", "Chocolates", "Snacks", "Others"],
      default: "Others"
    },

    // Status field is useful to hide products without deleting them
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// Optional: Index for faster search by shop or category
productSchema.index({ shopId: 1 });
productSchema.index({ category: 1 });

export const ProductModel = mongoose.model("Product", productSchema);