import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },

        email: { type: String, unique: true, sparse: true, trim: true },

        phone: { type: String, required: true, unique: true },

        password: { type: String, required: true },

        terms: { type: Boolean, required: true },

        isVerified: { type: Boolean, default: false },

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

export const ClientModel = mongoose.model("Client", clientSchema);
