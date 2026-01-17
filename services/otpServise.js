import { otpModel } from "../models/OTPModel.js";
import { sendOtpMail } from "../utils/otp.js";

export async function sendOtpService(email) {
    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to DB (replace old OTP if exists)
        await otpModel.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        ).lean();

        // Send OTP mail
        await sendOtpMail(email.toLowerCase(), otp);

        return { success: true, status: 201, message: "If the email is registered, OTP has been sent" };
    } catch (error) {
        next(error)
    }
}

export async function varifyOtpService(model, email) {
    try {
        const clientData = await model.findOne({ email })

        if (!clientData) {
            return { success: false, status: 400, error: "Email not found" };
        }
        clientData.isVerified = true
        clientData.save()
        // ✅ OTP is correct → delete from DB to prevent reuse
        await otpModel.deleteOne({ email });
       
        return { success: true, status: 200, message: "OTP verified successfully" };
    } catch (error) {
        next(error)
    }
}