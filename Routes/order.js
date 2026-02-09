import express from "express"
import { userSession } from "../middlewares/authmiddlewere.js"
import { createOrder, getOrder, deleteOrder, getMyOrders, getShopOrders, updateStatus, getShopLength, cancelOrder, updatePrice } from "../controllers/orderController.js"
import { authLimiter, createLimiter, standardLimiter } from "../middlewares/rateLimiters.js"
const app = express
const route = app.Router()

// get
route.get("/get", standardLimiter, userSession, getOrder);
route.get("/me", standardLimiter, userSession, getMyOrders);
route.get("/shop", userSession, getShopOrders);
route.get("/length", userSession, getShopLength);
// route.get("/get/:id", userSession, getOrderById);

// Post
route.post("/create", authLimiter, createLimiter, userSession, createOrder);

// delete
route.delete("/:id", createLimiter, userSession, deleteOrder);

// Put
route.put("/update", userSession, updateStatus)
route.put("/update-price", userSession, updatePrice)
route.put(
    "/cancel/:orderId",
    userSession,
    cancelOrder
)

export default route  