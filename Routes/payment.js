import express from "express"
import Razorpay from "razorpay"
import { subscriptions } from "../models/subscription.js";
import { userSession } from "../middlewares/authmiddlewere.js";
import { ShopModel } from "../models/ShopModel.js";
import crypto from "crypto";


const app = express
const route = app.Router()

const razorpay = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
});

route.post("/create-subscription", userSession, async (req, res) => {
    try {

        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "user not found" });
        }

        const shopData = await ShopModel.findOne({ clientId: user._id });

        if (!shopData) {
            console.log("❌ SHOP NOT FOUND");
            return res.status(404).json({ success: false, message: "shop not found" });
        }

        const subData = await subscriptions.findOne({ shopId: shopData._id });

        if (subData.status == "active") {
            console.log("❌ SUB ALREADY EXISTS");
            return res.status(409).json({ success: false, message: "Subscription already exists" });
        }

        const subscription = await razorpay.subscriptions.create({
            plan_id: "plan_S8oTxvwYnEzJfe",       // <-- REPLACE WITH YOUR PLAN ID
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

route.post("/webhook", async (req, res, next) => {
    try {
        // 1. Get the signature from the headers
        const razorpaySignature = req.headers["x-razorpay-signature"];

        // 2. Your Webhook Secret (Store this in .env for production)
        const secret = process.env.RAZOROK_SECRET;

        const shasum = crypto.createHmac("sha256", secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest("hex");

        // 4. Compare the signatures
        if (digest !== razorpaySignature) {
            console.error("Invalid signature: Request not from Razorpay");
            return res.status(400).json({ error: "Invalid signature" });
        }

        // --- Signature Verified: Proceed with Logic ---

        const event = req.body.event;
        const subEntity = req.body.payload.subscription?.entity;

        if (!subEntity) {
            return res.status(200).send("no subscription payload");
        }

        const clientSubscription = await subscriptions.findOne({
            razorpay_subscription_id: subEntity.id
        }).populate("shopId");

        if (!clientSubscription) {
            return res.status(200).send("subscription not found");
        }

        // Always update subscription record
        clientSubscription.status = subEntity.status;
        clientSubscription.current_start = subEntity.current_start || null;
        clientSubscription.current_end = subEntity.current_end || null;

        // ⭐ BUSINESS LOGIC
        if (clientSubscription.shopId) {

            // ✅ Payment success → ENABLE shop
            if (
                event === "subscription.activated" ||
                event === "subscription.charged"
            ) {
                clientSubscription.shopId.status = "active";
            }

            // ❌ Subscription stopped → DISABLE shop
            if (
                event === "subscription.cancelled" ||
                event === "subscription.completed" ||
                event === "subscription.paused"
            ) {
                clientSubscription.shopId.status = "inactive";
            }

            await clientSubscription.shopId.save();
        }

        await clientSubscription.save();

        res.status(200).send("ok");


    } catch (error) {
        console.error("Webhook Error:", error);
        // Still return 200 to Razorpay to prevent retry loops on logic errors, 
        // or 500 if you want them to retry. Usually 200 is safer for logic bugs.
        res.status(200).send("error handled");
    }
});

export default route