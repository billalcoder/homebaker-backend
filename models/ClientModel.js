import mongoose from "mongoose";
import bcrypt from "bcrypt"
const clientSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },

        email: { type: String, unique: true, sparse: true, trim: true },

        phone: { type: String, required: true, unique: true },

        password: { type: String, required: true },

        terms: { type: Boolean, required: true },

        isVerified: { type: Boolean, default: false },

        role: { type: { String, enum: ["user", "admin"] }, default: "user" },
        // ⭐ Add Location (GeoJSON)
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point"
            },
            coordinates: {
                type: [Number],   // [longitude, latitude]
                default: [0, 0]
            }
        }
    },
    { timestamps: true }
);

// ⭐ Add geospatial index for location
clientSchema.index({ location: "2dsphere" });

clientSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

export const ClientModel = mongoose.model("Client", clientSchema);
