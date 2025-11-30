import { loginService } from "../services/loginService.js";
import { userLoginValidation } from "../validations/userValidation.js";
import { registrationService } from "../services/registrationService.js"
import { userValidation } from "../validations/userValidation.js"
import { userModel } from "../models/UserModel.js"
import { logoutService } from "../services/logoutService.js"; // Adjust path 


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
        const { error, sessionId, statusCode } = await loginService(validation.data);

        // 3. Check Service Error
        if (error) {
            return res.status(statusCode).json({ error });
        }

        // 4. Success
        res.cookie("sid", sessionId.toString(), {
            httpOnly: true,
            sameSite: "none",
            secure: true,
            signed: true,
            maxAge: 1000 * 60 * 60 * 24 * 7
        });

        return res.status(200).json({ message: "User login successfully" });

    } catch (err) {
        console.error("🔴 LOGIN CONTROLLER CRASH:", err);
        next(err);
    }
}

export async function insertUser (req, res, next) {
    try {
        const result = userValidation.safeParse(req.body);
 
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

export async function logout(req, res, next) {
    try {
        // 1. Get Session ID from the request (attached by your authMiddleware)
        // If you don't have middleware yet, we check the signed cookie directly
        const sessionId = req.signedCookies.sid;

        if (sessionId) {
            // 2. Remove from DB
            await logoutService(sessionId);
        }

        // 3. Clear Cookie (Crucial!)
        res.clearCookie("sid", {
            httpOnly: true,
            sameSite: "none",
            secure: true,
            signed: true
        });

        return res.status(200).json({ message: "Logged out successfully" });

    } catch (err) {
        next(err);
    }
}