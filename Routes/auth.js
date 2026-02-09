import express from "express"
import { addUserAddress, insertUser, loginController, logout, sendOtp, updateUserPassword, updateUserProfile, varifyOtp } from "../controllers/loginController.js";
import { userSession } from "../middlewares/authmiddlewere.js";
import { authLimiter, standardLimiter } from "../middlewares/rateLimiters.js";

const app = express
const route = app.Router()

route.post("/register",authLimiter, insertUser);
route.post("/address" , userSession, addUserAddress);

route.post("/login", authLimiter,loginController);
route.post("/otp", authLimiter,sendOtp)
route.post("/varify", authLimiter,varifyOtp)

route.get("/profile", standardLimiter ,userSession, (req, res, next) => {
    const user = req.user
    if (!user) {
        return res.status(401).json({ success: false, data: "User not found" })
    }
    res.status(200).json({ success: true, data: user })
})

route.put("/updateprofile", userSession, updateUserProfile)
route.put("/updatepassword", userSession, updateUserPassword)

route.post("/logout", logout);

export default route  