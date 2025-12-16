import express from "express"
import { createOrder, getProduct, getProductById, getProductByShopId, getShop, getShopById } from "../controllers/shop.js"

const app = express
const route = app.Router()

route.get("/get", getShop)
route.get("/:id", getShopById)
route.get("/product/get/:shop" , getProductByShopId)
route.get("/product", getProduct)
route.get("/product/:id", getProductById)
route.post("/order", createOrder)

export default route  