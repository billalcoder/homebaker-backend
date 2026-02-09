import express from "express"
import { userSession } from "../middlewares/authmiddlewere.js";
import { addReview, getProductReviews } from "../controllers/review.js";
import { createLimiter } from "../middlewares/rateLimiters.js";

const app = express
const route = app.Router()

route.post("/", createLimiter, userSession, addReview);

route.get("/product/:productId", getProductReviews);


export default route  