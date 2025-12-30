import Razorpay from "razorpay";

let razorpayInstance = null;

function getRazorpay() {
  if (!razorpayInstance) {
    if (!process.env.RZP_KEY_ID || !process.env.RZP_KEY_SECRET) {
      throw new Error("Razorpay keys are missing in environment variables");
    }

    razorpayInstance = new Razorpay({
      key_id: process.env.RZP_KEY_ID,
      key_secret: process.env.RZP_KEY_SECRET,
    });
  }

  return razorpayInstance;
}


app.post("/create-subscription", async (req, res) => {
  try {
    const razorpay = getRazorpay();

    const subscription = await razorpay.subscriptions.create({
      plan_id: "plan_Rp4jbqL2ybYQ9H",
      customer_notify: 1,
      total_count: null, // infinite subscription
      quantity: 1,
    });

    res.json({
      success: true,
      subscription_id: subscription.id,
    });

  } catch (err) {
    console.error("Subscription error:", err.message);

    res.status(500).json({
      success: false,
      message: "Payment service temporarily unavailable",
    });
  }
});
