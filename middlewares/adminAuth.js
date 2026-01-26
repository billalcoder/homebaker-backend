export const verifyAdmin = (req, res, next) => {
    // Check if session exists and if admin is logged in
    if (req.session && req.session.adminId) {
        return next();
    }
    
    return res.status(401).json({ message: "Unauthorized. Please log in as Admin." });
};