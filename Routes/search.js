import express from "express";
import { ProductModel } from "../models/ProductModel.js";
import { ShopModel } from "../models/ShopModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(q, "i");

    // 1️⃣ Find shops matching name
    const shops = await ShopModel.find(
      { shopName: regex },
      { _id: 1 }
    );

    const shopIds = shops.map(shop => shop._id);

    // 2️⃣ Find products by product name OR shopId
    const products = await ProductModel.find({
      isActive: true,
      $or: [
        { productName: regex },
        { category: regex },
        { shopId: { $in: shopIds } }
      ]
    }).populate("shopId", "shopName");

    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

export default router;
