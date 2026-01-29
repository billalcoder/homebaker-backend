import express from "express";
import bcrypt from "bcrypt";
import { AdminModel } from "../models/admin.js"; 
import { userModel } from "../models/UserModel.js";
import { ClientModel } from "../models/ClientModel.js";
import { ProductModel } from "../models/ProductModel.js";
import { verifyAdmin } from "../middlewares/adminAuth.js";
import { deleteFromS3 } from "../utils/s3.js"; // 👈 IMPORT THIS

const router = express.Router();

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
        const user = await userModel.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // 🗑️ Delete User Image if it exists
        if (user.profileImage) {
            await deleteFromS3(user.profileImage);
        }

        await userModel.findByIdAndDelete(req.params.id);
        res.json({ message: "User and associated files deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 🏪 CLIENTS ---
router.get("/clients", async (req, res) => {
    try {
        const clients = await ClientModel.aggregate([
            // 1. Join Products (To get Count)
            {
                $lookup: {
                    from: "products", 
                    localField: "_id",
                    foreignField: "clientId",
                    as: "products"
                }
            },
            // 2. Join Shops (To get Shop Name)
            {
                $lookup: {
                    from: "shops", // The collection name for ShopModel (usually lowercase plural)
                    localField: "_id",
                    foreignField: "clientId",
                    as: "shopInfo"
                }
            },
            // 3. Unwind Shop Info (Convert array to object)
            {
                $unwind: {
                    path: "$shopInfo",
                    preserveNullAndEmptyArrays: true // Keep client even if they haven't created a shop yet
                }
            },
            // 4. Add Fields (Count & Shop Name)
            {
                $addFields: {
                    productCount: { $size: "$products" },
                    shopName: "$shopInfo.shopName",
                    profileImage : "$shopInfo.profileImage", // Extract shopName to the top level
                    coverImage : "$shopInfo.coverImage", // Extract shopName to the top level
                    shopDescription : "$shopInfo.shopDescription", // Extract shopName to the top level
                }
            },
            // 5. Final Projection (Cleanup)
            {
                $project: {
                    password: 0,
                    products: 0,  // Remove heavy product list
                    shopInfo: 0   // Remove the full shop object (we only needed the name)
                }
            }
        ]);
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

// 🔥 UPDATED: Delete Client + All S3 Images (Profile, Cover, Portfolio, Products)
router.delete("/clients/:id", async (req, res) => {
    try {
        const clientId = req.params.id;

        // 1. Fetch Client Data
        const client = await ClientModel.findById(clientId);
        if (!client) return res.status(404).json({ message: "Client not found" });

        // 🗑️ Delete Shop Profile & Cover Images
        if (client.profileImage) await deleteFromS3(client.profileImage);
        if (client.coverImage) await deleteFromS3(client.coverImage);

        // 🗑️ Delete Portfolio Images
        if (client.portfolio && client.portfolio.length > 0) {
            // Using Promise.all for faster parallel deletion
            await Promise.all(client.portfolio.map(async (item) => {
                if (item.imageUrl) await deleteFromS3(item.imageUrl);
            }));
        }

        // 2. Fetch & Delete All Products Images
        const products = await ProductModel.find({ clientId: clientId });
        
        if (products.length > 0) {
            for (const product of products) {
                if (product.images && product.images.length > 0) {
                    await Promise.all(product.images.map(async (imgUrl) => {
                        await deleteFromS3(imgUrl);
                    }));
                }
            }
        }

        // 3. Delete Data from DB
        await ProductModel.deleteMany({ clientId: clientId });
        await ClientModel.findByIdAndDelete(clientId);

        res.json({ message: "Client, products, and all S3 images deleted successfully" });
    } catch (error) {
        console.error("Delete Client Error:", error);
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