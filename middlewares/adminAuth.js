export const verifyAdmin = (req, res, next) => {
    const isAdmin = req.admin
    // Check if session exists and if admin is logged in
    if (isAdmin) {
        return next();
    }
    return res.status(401).json({ message: "Unauthorized. Please log in as Admin." });
};