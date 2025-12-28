import express from "express"
import { insertUser, loginController, logout, updateUserPassword, updateUserProfile } from "../controllers/loginController.js";
import { userSession } from "../middlewares/authmiddlewere.js";

const app = express
const route = app.Router()

route.post("/register", insertUser);

route.post("/login", loginController);

route.get("/profile", userSession, (req, res, next) => {
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