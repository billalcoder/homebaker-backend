import express from "express"
import { insertUser, loginController, logout } from "../controllers/loginController.js";

const app = express
const route = app.Router()
 
route.post("/register", insertUser);

route.post("/login", loginController);

route.post("/logout", logout);
 
export default route  