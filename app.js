import "./db/db.js"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import auth from "./Routes/auth.js"
import client from "./Routes/clientAuth.js"
import order from "./Routes/order.js"
import { sanitizeRequest } from "./middlewares/sanitizationMiddlewere.js"
import hpp from "hpp"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import payment from "./Routes/payment.js"
import shop from "./Routes/shop.js"
import review from "./Routes/review.js"
import searchRoutes from "./Routes/search.js"
import { errorHandler } from "./middlewares/errorHandler.js"
import { ErrorLog } from "./models/errorlog.js"
import admin from "./Routes/adminRoutes.js"
import { userSession } from "./middlewares/authmiddlewere.js"
import { verifyAdmin } from "./middlewares/adminAuth.js"
const app = express()
app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }))
app.use(cors({ origin: ["http://localhost:5502", "https://app.bakerlane.shop", "https://migdalia-unvetoed-obstructedly.ngrok-free.dev", "http://localhost:5173", "http://localhost:5174", "https://homebaker.netlify.app", "https://bakerlane.netlify.app", "https://bakerlane.shop"], credentials: true }))
app.use(compression())
app.use(cookieParser(process.env.SECRET))
app.use(sanitizeRequest)
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  xPoweredBy: false,            // Hide "Express" (Security Misconfiguration)
  xContentTypeOptions: true,    // Prevent MIME sniffing
}));
app.use(hpp())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.get("/", (req, res) => {
  res.status(200).send("Backend is alive!");
});

app.post("/log/frontend", async (req, res) => {
  try {
    const {
      message,
      stack,
      route,
      method,
      statusCode,
      requestBody,
      source,
      platform,
      email,
      userId,
    } = req.body;

    await ErrorLog.create({
      message: message || "Frontend error",
      stack,
      route,
      method,
      statusCode,
      requestBody,
      source: source || "frontend",
      platform,
      email,
      userId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Failed to save frontend log:", err);
    res.sendStatus(500);
  }
});


app.use(limiter);

app.use("/auth", auth)

app.use("/client", client)

app.use("/order", order)

app.use("/payment", payment)

app.use("/shop", shop)

app.use("/review", review)

app.use("/search", searchRoutes);

app.use("/admin", userSession, verifyAdmin, admin)

// Add a new POST route specifically for client-side logging
app.post('/api/client-log', (req, res) => {
  const { error, context, device } = req.body;

  // Use a special prefix so these stand out in your PM2 logs
  console.error("🚨 === CLIENT PHONE ERROR REPORT === 🚨");
  console.error("Time:", new Date().toISOString());
  console.error("Device:", device); // Shows if it's iPhone/Android
  console.error("Context:", context); // Where did it happen?
  console.error("Error Message:", error.message);
  console.error("Stack Trace:", error.stack);
  console.error("========================================");

  // Send success back so the client app doesn't hang
  res.json({ success: true });
});

app.use(errorHandler)

if (process.env.NODE_ENV !== "test") {
  app.listen(4000, (err) => {
    if (err) console.log(err);
    console.log("server is running 4000");
  })
}

export default app