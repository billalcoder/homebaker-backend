import express from "express";
import bcrypt from "bcrypt";
import { AdminModel } from "../models/admin.js"; 
import { userModel } from "../models/UserModel.js";
import { ClientModel } from "../models/ClientModel.js";
import { ProductModel } from "../models/ProductModel.js";
import { verifyAdmin } from "../middlewares/adminAuth.js";
import { deleteFromS3 } from "../utils/s3.js"; // 👈 IMPORT THIS
import { sessionModel } from "../models/SessionModel.js";
import { ShopModel } from "../models/ShopModel.js";

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

        // 1. Fetch Client
        const client = await ClientModel.findById(clientId);
        if (!client) return res.status(404).json({ message: "Client not found" });

        // 2. Fetch Associated Shop (Because Portfolio is here!)
        const shop = await ShopModel.findOne({ clientId: clientId });

        if (shop) {
            // 🗑️ A. Delete Shop-Specific Images
            // (Assuming shop has coverImage/profileImage, not client)
            if (shop.profileImage) await deleteFromS3(shop.profileImage);
            if (shop.coverImage) await deleteFromS3(shop.coverImage);


            // 🗑️ C. Fetch & Delete All Products Linked to this SHOP
            const products = await ProductModel.find({ shopId: shop._id });

            if (products.length > 0) {
                // Delete product images first
                await Promise.all(products.map(async (product) => {
                    if (product.images && product.images.length > 0) {
                        await Promise.all(product.images.map(imgUrl => deleteFromS3(imgUrl)));
                    }
                }));

                // Delete product documents
                await ProductModel.deleteMany({ shopId: shop._id });
            }

            // 🗑️ D. Delete the Shop Document itself
            await ShopModel.findByIdAndDelete(shop._id);
        }

        // 3. Delete The Client Document
        await ClientModel.findByIdAndDelete(clientId);

        // 4. Delete Session (If you store sessions in MongoDB)
        // Adjust 'sessions' to your actual collection name if different
        // specific deletion depends on how you store session data (e.g. by user_id or cookie)
        try {
            await sessionModel.deleteMany({ userId: clientId });
            // OR if you use a RefreshToken model:
            // await RefreshTokenModel.deleteMany({ userId: clientId });
        } catch (err) {
            console.warn("Session deletion warning:", err.message);
        }

        res.json({ message: "Account, Shop, Portfolio, and Products deleted successfully" });

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