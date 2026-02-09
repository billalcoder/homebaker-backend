import express from "express"
import { createOrder, getProduct, getProductById, getProductByShopId, getShop, getShopById, status, toggle } from "../controllers/shop.js"
import { userSession } from "../middlewares/authmiddlewere.js"
import { createLimiter, standardLimiter } from "../middlewares/rateLimiters.js"

const app = express
const route = app.Router()
route.use(standardLimiter);
route.get("/get", getShop)
route.get("/status", userSession, status);
route.get("/:id", getShopById)
route.get("/product/get/:shop", getProductByShopId)
route.get("/product", getProduct)
route.get("/product/:id", getProductById)
route.post("/order", createLimiter, createOrder)

route.patch("/toggle-status", userSession, toggle);
export default route  