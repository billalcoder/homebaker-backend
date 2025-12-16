import Razorpay from "razorpay"

const razorpay = new Razorpay({
    key_id: process.env.RZP_KEY_ID,
    key_secret: process.env.RZP_KEY_SECRET,
});

app.post("/create-subscription", async (req, res) => {
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: "plan_Rp4jbqL2ybYQ9H",       // <-- REPLACE WITH YOUR PLAN ID
      customer_notify: 1,
      total_count: null,         // infinite subscription (recommended)
      quantity: 1,
      // trial_days: 7,          // Optional trial
    });
    
    console.log(subscription);

    res.json({
      success: true,
      subscription_id: subscription.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});