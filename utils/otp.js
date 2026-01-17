
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS, // Gmail App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendOtpMail(userEmail, otp) {
  const mailOptions = {
    from: "BakerLane  <billalshekhani23@gmail.com>",
    to: userEmail,
    subject: "🔑 BakerLane Login - Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background:#fdfdfd;">
        <h2 style="color:#2c3e50;">🔑 One-Time Password (OTP)</h2>
        
        <p>Hi,</p>
        <p>Your OTP for <b>BakerLane</b> login is:</p>
        
        <h1 style="color:#27ae60; text-align:center; letter-spacing: 3px;">${otp}</h1>
        
        <p style="color:#2c3e50;">This OTP will expire in <b>5 minutes</b>. Do not share it with anyone.</p>
        
        <hr/>
        <small style="color: gray;">© ${new Date().getFullYear()} ShoeCrew Team</small>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent to:", userEmail);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);
  }
}

export async function sendOrderStatusMail({
  userEmail,
  orderId,
  oldStatus,
  newStatus
}) {
  const mailOptions = {
    from: "BakerLane <billalshekhani23@gmail.com>",
    to: userEmail,
    subject: `📦 Order Update: ${newStatus.toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border-radius: 10px; background:#fdfdfd; border:1px solid #eee;">
        <h2 style="color:#2c3e50;">📦 Order Status Updated</h2>

        <p>Hello,</p>

        <p>Your order status has been updated:</p>

        <table style="width:100%; margin-top:15px;">
          <tr>
            <td><b>Order ID</b></td>
            <td>${orderId}</td>
          </tr>
          <tr>
            <td><b>Previous Status</b></td>
            <td style="color:#e67e22;">${oldStatus}</td>
          </tr>
          <tr>
            <td><b>Current Status</b></td>
            <td style="color:#27ae60;">${newStatus}</td>
          </tr>
        </table>

        <p style="margin-top:20px;">
          Thank you for ordering from <b>BakerLane</b> 🍰
        </p>

        <hr/>
        <small style="color: gray;">
          © ${new Date().getFullYear()} BakerLane
        </small>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Order status email sent to:", userEmail);
  } catch (error) {
    console.error("❌ Failed to send order status email:", error);
  }
}

export async function sendNewOrderAlertMail({
  bakerEmail,
  bakerName,
  shopName,
  orderId,
  productName,
  quantity,
  totalAmount
}) {
  const mailOptions = {
    from: "BakerLane <billalshekhani23@gmail.com>",
    to: bakerEmail,
    subject: "🧁 New Order Received!",
    html: `
      <div style="font-family:Arial;padding:20px;border:1px solid #ddd;border-radius:10px">
        <h2>🧁 New Order Alert</h2>

        <p>Hello <b>${bakerName}</b>,</p>

        <p>You have received a new order at <b>${shopName}</b>.</p>

        <p><b>Order ID:</b> ${orderId}</p>
        <p><b>Product:</b> ${productName}</p>
        <p><b>Quantity:</b> ${quantity}</p>
        <p><b>Total Amount:</b> ₹${totalAmount}</p>

        <p>Please login to your dashboard to process the order.</p>

        <hr/>
        <small>© ${new Date().getFullYear()} BakerLane</small>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}