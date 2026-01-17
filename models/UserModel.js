import mongoose from "mongoose";
import bcrypt from "bcrypt";

// --- MONGOOSE SCHEMA ---
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, unique: true, sparse: true, trim: true },
        phone: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        terms: { type: Boolean, required: true },
        isVerified: { type: Boolean, default: false },

        // New Nested Address Schema
        address: {
            flatNo: { type: String, required: true, trim: true },
            buildingName: { type: String, required: true, trim: true },
            area: { type: String, required: true, trim: true },
            city: { type: String, required: true, trim: true },
            pincode: { type: String, required: true, trim: true },
            state: { type: String, required: true, trim: true }
        }
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

export const userModel = mongoose.model("User", userSchema);