import { loginService } from "../services/loginService.js";
import { addressValidation, userLoginValidation, userRegistrationValidation } from "../validations/userValidation.js";
import { registrationService } from "../services/registrationService.js"
// import { userRegistrationValidation } from "../validations/userValidation.js"
import { userModel } from "../models/UserModel.js"
import { logoutService } from "../services/logoutService.js"; // Adjust path 
import {
    updateProfileService,
    updatePasswordService
} from "../services/ProfileUpdate.js";
import {
    userUpdateValidation,
    userPasswordValidation
} from "../validations/userValidation.js";
import { sendOtpSchema, verifyOtpSchema } from "../validations/otpValidation.js";
import { sendOtpService, varifyOtpService } from "../services/otpServise.js";
import { otpModel } from "../models/OTPModel.js";

export async function loginController(req, res, next) {
    try {
        // 1. Validation
        // Don't destructure 'error' yet to avoid naming conflicts later
        const validation = userLoginValidation.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: validation.error.errors[0].message
            });
        }

        // 2. Call Service
        // FIX: Destructure 'error', NOT 'err' (The service returns 'error')
        const { error, sessionId, statusCode } = await loginService(validation.data, userModel, "User");

        // 3. Check Service Error
        if (error) {
            return res.status(statusCode).json({ error });
        }

        // 4. Success
        res.cookie("sid", sessionId.toString(), {
            httpOnly: true,
            sameSite: "none",
            secure: true,
            maxAge: 1000 * 60 * 60 * 24 * 7
        });

        return res.status(200).json({ message: "User login successfully" });

    } catch (err) {
        console.error("🔴 LOGIN CONTROLLER CRASH:", err);
        next(err);
    }
}

export async function insertUser(req, res, next) {
    try {
        // Use the NEW simple registration validation
        const result = userRegistrationValidation.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                error: result.error.errors[0].message,
            });
        }

        const { error, message } = await registrationService(result.data, userModel);

        if (error) {
            return res.status(400).json({ error });
        }

        res.status(201).json({ message });

    } catch (err) {
        console.error(err);
        next(err);
    }
}

// 🔥 NEW: Add Address Controller
export async function addUserAddress(req, res, next) {
    try {
        const userId = req.user._id; // Assuming userSession middleware sets this
        const result = addressValidation.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({ error: result.error.errors[0].message });
        }

        const user = await userModel.findByIdAndUpdate(
            userId,
            { $set: { address: result.data } },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json({ success: true, message: "Address updated successfully", address: user.address });

    } catch (error) {
        next(error);
    }
}

export async function logout(req, res, next) {
    try {
        // 1. Get Session ID from the request (attached by your authMiddleware)
        // If you don't have middleware yet, we check the signed cookie directly
        const sessionId = req.cookies.sid;

        if (sessionId) {
            // 2. Remove from DB
            try {
                const { error, message } = await logoutService(sessionId);
                if (error) {
                    return res.status(400).json(error)
                }
                // 3. Clear Cookie (Crucial!)
                res.clearCookie("sid", {
                    httpOnly: true,
                    sameSite: "none",
                    secure: true,
                    signed: true
                });

                return res.status(200).json({ message });
            } catch (err) {
                return res.status(500).json({ err });
            }
        }
        return res.status(404).json({ error: "Cannot Logout" });

    } catch (err) {
        next(err);
    }
}

export async function updateUserProfile(req, res) {
    try {
        const parsed = userUpdateValidation.safeParse(req.body.profile);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error });
        }


        await updateProfileService({
            model: userModel,
            authUser: req.user,
            data: parsed.data
        });

        res.json({ success: true, message: "User profile updated" });

    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
}

export async function updateUserPassword(req, res) {
    try {
        const parsed = userPasswordValidation.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: parsed.error
            });
        }

        await updatePasswordService({
            model: userModel,
            authUser: req.user,
            data: parsed.data
        });

        res.json({
            success: true,
            message: "User password updated successfully"
        });

    } catch (err) {

        res.status(err.status || 500).json({
            success: false,
            message: err.message || "Something went wrong"
        });
    }
}

export const sendOtp = async (req, res, next) => {
    try {
        const result = sendOtpSchema.safeParse(req.body);

        if (!result.success) return res.status(400).json({ err: result.error.errors });
        const data = result.data
        const email = data?.email.toLowerCase()
        if (!email) {
            return res.status(400).json({ error: "invalid email" })
        }
        const { success, message, status } = await sendOtpService(email)
        if (success) {
            return res.status(status).json({ success: true, message })
        }

    } catch (error) {
        next(error)
    }
}

export const varifyOtp = async (req, res, next) => {
    try {
        const result = verifyOtpSchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ err: result.error.errors });
        const { email, otp } = result.data

        // Find OTP from DB
        const record = await otpModel.findOne({ email }).lean();

        if (!record) {
            return res.status(400).json({ message: "OTP expired or not found" });
        }

        if (record.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const { success, status, message, error } = await varifyOtpService(userModel, email)
        if (success) {
            return res.status(status).json({ success: true, message });
        }
        return res.status(status).json({ success: false, error })
    } catch (error) {
        next(error)
    }
}

