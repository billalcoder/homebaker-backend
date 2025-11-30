import { sessionModel } from "../models/SessionModel.js";

export async function logoutService(sessionId) {
    try {
        // Delete the specific session from the DB
        const deleteuser = await sessionModel.deleteOne({ _id: sessionId });
        if (deleteuser.deletedCount === 0) {
            return { message: "Logged out successfully" };
        }
        
        return {message : "already logout"}
    } catch (err) {
        console.error("Logout Service Error:", err);
        return { error: "Could not log out" };
    }
}