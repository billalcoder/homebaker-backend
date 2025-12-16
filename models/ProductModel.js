import mongoose from "mongoose";

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
      enum: [
        "Cake", "Pastry", "Cookies", "Bread", "Brownie",
        "Donuts", "Chocolates", "Snacks", "Others"
      ],
      default: "Others"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    /* ⭐⭐⭐ REVIEW FIELDS (NEW) ⭐⭐⭐ */

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

// Indexes
productSchema.index({ shopId: 1 });
productSchema.index({ category: 1 });

export const ProductModel = mongoose.model("Product", productSchema);
