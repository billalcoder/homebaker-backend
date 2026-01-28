import mongoose, { model } from "mongoose";

const subscriptionSchema = new mongoose.Schema({
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

    razorpay_subscription_id: {
        type: String,
        required: true
    },

    razorpay_plan_id: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: [
            "created",
            "authenticated",
            "paused",
            "active",
            "pending",
            "halted",
            "completed",
            "cancelled"
        ],
        default: "created"
    },

    current_start: { type: Number }, // timestamp
    current_end: { type: Number },   // next billing timestamp
    quantity: { type: Number, default: 1 },

    // Razorpay invoice mapping
    last_invoice_id: { type: String },

    // For UI
    next_billing_date: { type: Date },
    last_payment_date: { type: Date },

    // Audit fields
    createdAt: { type: Date, default: Date.now },
});

export const subscriptions = model("subscription", subscriptionSchema)
