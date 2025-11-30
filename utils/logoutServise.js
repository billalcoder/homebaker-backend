import { sessionModel } from "../models/SessionModel.js";

export async function logoutService(sessionId) {
    try {
        // Delete the specific session from the DB
        await sessionModel.deleteOne({ _id: sessionId });
        return { message: "Logged out successfully" };
    } catch (err) {
        console.error("Logout Service Error:", err);
        return { error: "Could not log out" };
    }
}