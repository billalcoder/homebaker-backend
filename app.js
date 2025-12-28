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
import rateLimit from "express-rate-limit"
import payment from "./Routes/payment.js"
import shop from "./Routes/shop.js"
import review from "./Routes/review.js"
import searchRoutes from "./Routes/search.js"
const app = express()

app.use(express.json({ limit: '50kb' }))
app.use(cors({ origin: ["http://localhost:5502", "http://localhost:5173", "http://localhost:5174", "https://homebaker.netlify.app", "https://bakerlane.netlify.app"], credentials: true }))
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

// app.use(limiter);

app.use("/auth", auth)

app.use("/client", client)

app.use("/order", order)

app.use("/payment", payment)

app.use("/shop", shop)

app.use("/review", review)

app.use("/search", searchRoutes);

app.use((err, req, res, next) => {
    console.error("❌ Error:", err);

    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (err.name === "ZodError") {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            errors: err.errors.map(e => e.message)
        });
    }

    return res.status(status).json({
        success: false,
        message,
    });
})

if (process.env.NODE_ENV !== "test") {
    app.listen(4000, (err) => {
        if (err) console.log(err);
        console.log("server is running 4000");
    })
}

export default app