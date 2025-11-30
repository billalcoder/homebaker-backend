import bcrypt from "bcrypt";
import { findEmail } from "../utils/findEmail.js";
import { sessionModel } from "../models/SessionModel.js";
import { ClientModel } from "../models/ClientModel.js";
import { ShopModel } from "../models/ShopModel.js";

export async function loginService(loginData) {
    const { email, password } = loginData;

    // 1. Check User Existence
    const userData = await findEmail(email, ClientModel);

    if (!userData) {
        // FIX: Ensure key is 'error', NOT 'err'
        return { statusCode: 401, error: "Invalid email or password" };
    }

    // 2. Compare Password
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
        // FIX: Ensure key is 'error'
        return { statusCode: 401, error: "Invalid email or password" };
    }

    // 3. Handle Session Limits
    try {
        const activeSessions = await sessionModel
            .find({ userId: userData._id })
            .sort({ createdAt: 1 });

        if (activeSessions.length >= 2) {
            await sessionModel.deleteOne({ _id: activeSessions[0]._id });
        }

        // 4. Create New Session
        const userSession = await sessionModel.create({
            userId: userData._id,
            // FIX: Ensure expireAt is added to prevent Schema Validation Error
            expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        const isShop = await ShopModel.findOne({ clientId: userData._id })
        if(!isShop){
            await ShopModel.create({
                clientId: userData._id,
            })
        }

        return { sessionId: userSession._id };

    } catch (err) {
        console.error("Session Error:", err);
        // FIX: Ensure key is 'error' here too!
        return { statusCode: 500, error: "Login failed during session creation" };
    }
}