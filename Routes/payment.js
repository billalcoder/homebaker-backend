import express from "express"
import Razorpay from "razorpay"
import { subscriptions } from "../models/subscription.js";
import { userSession } from "../middlewares/authmiddlewere.js";
import { ShopModel } from "../models/ShopModel.js";

const app = express
const route = app.Router()

const razorpay = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
});

route.post("/create-subscription", userSession, async (req, res) => {
    const user = req.user
    if (!user) {
        return res.status(404).json({ success: false, message: "user not found" })
    }
    const shopData = await ShopModel.findOne({ clientId: user._id })
    if (!shopData) {
        return res.status(404).json({ success: false, message: "shop not found" })
    }
    try {
        const subscription = await razorpay.subscriptions.create({
            plan_id: "plan_Rp4jbqL2ybYQ9H",       // <-- REPLACE WITH YOUR PLAN ID
            customer_notify: 1,
            total_count: 120,         // infinite subscription (recommended)
            quantity: 1,
            // trial_days: 7,          // Optional trial
        });

        await subscriptions.create({
            userId: user._id,
            shopId: shopData._id,
            razorpay_subscription_id: subscription.id,
            razorpay_plan_id: subscription.plan_id,
            status: subscription.status,        // usually "created"
            quantity: subscription.quantity,
            current_start: subscription.current_start || null,
            current_end: subscription.current_end || null,
        });

        res.json({
            success: true,
            subscription_id: subscription.id,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

export default route  