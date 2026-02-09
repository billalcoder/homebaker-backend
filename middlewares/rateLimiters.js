// middlewares/rateLimiters.js
import rateLimit from 'express-rate-limit';

// 1. Strict Limiter: For Login, Register, OTP (Prevents brute force)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. Standard Limiter: For General Browsing (Shops, Products)
export const standardLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // Limit each IP to 120 requests per minute (2 req/sec)
    message: { error: 'Too many requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. Search Limiter: For Search & Filter (Expensive DB operations)
export const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 search requests per minute
    message: { error: 'Search limit exceeded, please wait a moment.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 4. Creation Limiter: For Creating Orders, Reviews, Adding Products
export const createLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 write operations per minute
    message: { error: 'You are performing actions too quickly.' },
    standardHeaders: true,
    legacyHeaders: false,
});