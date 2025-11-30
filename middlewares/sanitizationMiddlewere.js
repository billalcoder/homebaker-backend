// middleware/sanitizeMiddleware.js
import xss from "xss";

export function sanitizeRequest(req, res, next) {
    const sanitize = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === "string") obj[key] = xss(obj[key], {
                whiteList: {}, // empty whitelist — disallow all tags
                stripIgnoreTag: true, // remove all tags
                stripIgnoreTagBody: ["script"], // remove script tag content too
            });
            else if (typeof obj[key] === "object" && obj[key] !== null) sanitize(obj[key]);
        }
    };

    sanitize(req.body);
    sanitize(req.query);
    sanitize(req.params);

    next();
}
