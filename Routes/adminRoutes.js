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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        // Build Search Query for initial match (Client fields)
        let matchStage = {};
        if (search) {
            const regex = { $regex: search, $options: "i" };
            matchStage = {
                $or: [{ name: regex }, { email: regex }]
            };
        }

        const pipeline = [
            // 1. Initial Filter (Name/Email)
            { $match: matchStage },
            
            // 2. Join Products
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "clientId",
                    as: "products"
                }
            },
            // 3. Join Shops
            {
                $lookup: {
                    from: "shops",
                    localField: "_id",
                    foreignField: "clientId",
                    as: "shopInfo"
                }
            },
            {
                $unwind: {
                    path: "$shopInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            // 4. Add Fields
            {
                $addFields: {
                    productCount: { $size: "$products" },
                    shopName: "$shopInfo.shopName",
                    profileImage: "$shopInfo.profileImage",
                    coverImage: "$shopInfo.coverImage",
                    shopDescription: "$shopInfo.shopDescription"
                }
            },
            // 5. Secondary Match (If searching by Shop Name)
            ...(search ? [{
                $match: {
                    $or: [
                        { name: { $regex: search, $options: "i" } },
                        { email: { $regex: search, $options: "i" } },
                        { shopName: { $regex: search, $options: "i" } }
                    ]
                }
            }] : []),
            
            // 6. Cleanup
            {
                $project: {
                    password: 0,
                    products: 0,
                    shopInfo: 0
                }
            },
            // 7. Pagination Facet
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ];

        const result = await ClientModel.aggregate(pipeline);
        
        const data = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

        res.json({
            success: true,
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            query = {
                $or: [
                    { productName: { $regex: search, $options: "i" } },
                    { category: { $regex: search, $options: "i" } }
                ]
            };
        }

        const total = await ProductModel.countDocuments(query);
        
        const products = await ProductModel.find(query)
            .populate("clientId", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            data: products,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
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