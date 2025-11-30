import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },

        email: { type: String, unique: true, sparse: true, trim: true },

        phone: { type: String, required: true, unique: true },

        password: { type: String, required: true },

        terms: { type: Boolean, required: true },

        isVerified: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export const userModel = mongoose.model("User", userSchema);
