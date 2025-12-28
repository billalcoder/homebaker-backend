
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