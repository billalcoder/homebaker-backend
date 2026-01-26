import express from "express";
import bcrypt from "bcrypt";
import { AdminModel } from "../models/admin.js"; 
import { userModel } from "../models/UserModel.js";
import { ClientModel } from "../models/ClientModel.js";
import { ProductModel } from "../models/ProductModel.js";
import { verifyAdmin } from "../middleware/adminAuth.js";

const router = express.Router();

// ==========================================
// 🔓 PUBLIC ROUTES (Login / Seed)
// ==========================================

// 1. Admin Login (Session Based)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await AdminModel.findOne({ email });
        
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // ✅ SET SESSION
        req.session.adminId = admin._id;
        req.session.role = admin.role;
        req.session.isAdmin = true;

        // Force save to ensure session is written before response
        req.session.save(err => {
            if(err) return res.status(500).json({message: "Session Error"});
            res.json({ message: "Login successful", role: admin.role });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Admin Logout
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ message: "Could not log out" });
        res.clearCookie("connect.sid"); // Default cookie name
        res.json({ message: "Logout successful" });
    });
});

// 3. Seed Admin (Use once then delete/protect)
router.post("/create-seed", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Simple check to prevent re-seeding if admin exists (optional)
        const exists = await AdminModel.findOne({ email });
        if(exists) return res.status(400).json({ message: "Admin already exists" });

        const newAdmin = new AdminModel({ email, password });
        await newAdmin.save();
        res.status(201).json({ message: "Admin created" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🛡️ PROTECTED ROUTES (Requires Session)
// ==========================================
router.use(verifyAdmin); 

// --- 👥 USERS ---
router.get("/users", async (req, res) => {
    try {
        const users = await userModel.find().select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/users/:id", async (req, res) => {
    try {
        await userModel.findByIdAndDelete(req.params.id);
        res.json({ message: "User deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 🏪 CLIENTS ---
router.get("/clients", async (req, res) => {
    try {
        const clients = await ClientModel.find().select("-password");
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch("/clients/:id/verify", async (req, res) => {
    try {
        const client = await ClientModel.findByIdAndUpdate(
            req.params.id, 
            { isVerified: true }, 
            { new: true }
        );
        res.json({ message: "Client verified", client });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/clients/:id", async (req, res) => {
    try {
        await ProductModel.deleteMany({ clientId: req.params.id });
        await ClientModel.findByIdAndDelete(req.params.id);
        res.json({ message: "Client and products deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 🍰 PRODUCTS ---
router.get("/products", async (req, res) => {
    try {
        const products = await ProductModel.find().populate("clientId", "name email");
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch("/products/:id/toggle-status", async (req, res) => {
    try {
        const product = await ProductModel.findById(req.params.id);
        if(!product) return res.status(404).json({message: "Product not found"});
        
        product.isActive = !product.isActive;
        await product.save();
        res.json({ message: `Product ${product.isActive ? 'Active' : 'Inactive'}`, product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check Admin Status (Helper for frontend)
router.get("/me", (req, res) => {
    res.json({ 
        isAuthenticated: true, 
        role: req.session.role, 
        adminId: req.session.adminId 
    });
});

export default router;