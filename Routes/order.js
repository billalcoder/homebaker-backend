import express from "express"
import { userSession } from "../middlewares/authmiddlewere.js"
import { createOrder, getOrder, deleteOrder, getMyOrders, getShopOrders, updateStatus, getShopLength, cancelOrder, updatePrice } from "../controllers/orderController.js"
const app = express
const route = app.Router()

// get
route.get("/get", userSession, getOrder);
route.get("/me", userSession, getMyOrders);
route.get("/shop", userSession, getShopOrders);
route.get("/length", userSession, getShopLength);
// route.get("/get/:id", userSession, getOrderById);

// Post
route.post("/create", userSession, createOrder)

// delete
route.delete("/:id", userSession, deleteOrder);

// Put
route.put("/update", userSession, updateStatus)
route.put("/update-price" , userSession , updatePrice)
route.put(
    "/cancel/:orderId",
    userSession,
    cancelOrder
)

export default route  