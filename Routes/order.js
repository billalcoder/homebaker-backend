import express from "express"
import { userSession } from "../middlewares/authmiddlewere.js"
import { createOrder, getOrder, deleteOrder, getMyOrders, getShopOrders } from "../controllers/orderController.js"
const app = express
const route = app.Router()

route.post("/create", userSession, createOrder)
route.get("/get", userSession, getOrder);

// Logged-in user
route.get("/me", userSession, getMyOrders);

// Seller
route.get("/shop", userSession, getShopOrders);
route.delete("/:id", userSession, deleteOrder);

export default route  