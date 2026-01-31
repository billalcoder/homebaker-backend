import mongoose from "mongoose";

const portfolioItemSchema = new mongoose.Schema({
  imageUrl: { type: String },
  title: { type: String, trim: true },
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
  price: { type: String }
});

const shopSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    shopName: { type: String },

    // MVP Profile Setup: Not required on Register, but updated later
    shopDescription: { type: String, default: "About your shop will appear here.", },
    shopCategory: { type: String, default: "General" }, // e.g., Bakery, Clothing

    // Branding
    profileImage: {
      type: String,
      default: "https://placehold.co/400" // Default placeholder image
    },
    coverImage: { type: String, default: "" },

    // Location Details (Split for better filtering later)
    address: { type: String },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },

    // Socials & Links (Embedded Object)
    socialLinks: {
      instagram: { type: String, default: "" },
      whatsapp: { type: String, default: "" }, // Different from auth phone
      website: { type: String, default: "" }
    },

    portfolio: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ],
    // ⭐ Overall Review Fields
    averageRating: {
      type: Number,
      default: 0,       // calculated from all reviews
      min: 0,
      max: 5
    },

    totalReviews: {
      type: Number,
      default: 0        // how many reviews this shop has
    },

    totalOrder: { type: Number, default: 1 },
    productCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "active",
        "inactive"
      ],
      default: "inactive"
    },
    isActive: { type: Boolean, default: true } // Admin can ban/suspend
  },
  { timestamps: true }
);
shopSchema.index({ location: "2dsphere" });
export const ShopModel = mongoose.model("Shop", shopSchema);
