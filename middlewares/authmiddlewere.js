import { sessionModel } from "../models/SessionModel.js";

export async function userSession(req, res, next) {
    try {
        const session = req.signedCookies.sid
        console.log("this is a session "+session);
        if (!session) return res.status(404).json({ error: "session not found" })
        const user = await sessionModel.findOne({ _id: session }).select("-password -_id").populate("userId")
        if (!user) {
            return res.status(400).json({ error: "Invalid session" });
        }
        req.session = session
        req.user = user.userId
        next()
    } catch (error) {
        console.error("Error in finduser middleware:", error);
        return res.status(500).json({ error: "Server error" });
    }
}