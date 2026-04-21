import express from "express";
import { aiData } from "../controllers/aiController.js";

const app = express()
const router = express.Router()

router.post("/prompt" , aiData)

export default router