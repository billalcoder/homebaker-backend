import mongoose from "mongoose"

const driverSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },

        email: { type: String, unique: true, sparse: true },

        phone: { type: String, required: true, unique: true },

        password: { type: String, required: true },

        licenceNumber: { type: String, required: true },

        terms: { type: Boolean, required: true },

        isVerified: { type: Boolean, default: false },

        // GeoJSON location
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point"
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0]
            },
            updatedAt: {
                type: Date,
                default: Date.now
            }
        },

        isOnline: { type: Boolean, default: false },

        activeOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null
        }
    },

    { timestamps: true }
);

driverSchema.index({ location: "2dsphere" });

export const driverModel = mongoose.model("Driver", driverSchema);
