import { ErrorLog } from "../models/errorlog.js";

export const errorHandler = async (err, req, res, next) => {
  console.error("❌ Error:", err);

  try {
    await ErrorLog.create({
      message: err.message,
      stack: err.stack,
      route: req.originalUrl,
      method: req.method,
      statusCode: err.statusCode || 500,
      userId: req.user?._id,
      email: req.user?.email,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      requestBody: req.body,
      source: "backend",
    });
  } catch (logErr) {
    console.error("❌ Failed to save error log:", logErr);
  }

  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors.map(e => e.message),
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};


