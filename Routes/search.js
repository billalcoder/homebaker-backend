import express from "express";
import { ProductModel } from "../models/ProductModel.js";
import { ShopModel } from "../models/ShopModel.js";
import { ClientModel } from "../models/ClientModel.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { q, lat, lng } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    const regex = new RegExp(q, "i");
    if (!lat || !lng) {
      const products = await ProductModel
        .find({
          isActive: true,
          $or: [
            { productName: regex },
            { category: regex }
          ]
        })
        .populate("shopId", "shopName");

      return res.json({ success: true, data: products });
    }



    const results = await ClientModel.aggregate([
      // 1️⃣ Geo first
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          distanceField: "distance",
          spherical: true,
          maxDistance: 10000, // 10 KM
          distanceMultiplier: 0.001
        }
      },

      // 2️⃣ Products
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "clientId",
          as: "product"
        }
      },
      { $unwind: "$product" },

      // 3️⃣ Shops
      {
        $lookup: {
          from: "shops",
          localField: "product.shopId",
          foreignField: "_id",
          as: "shop"
        }
      },
      { $unwind: "$shop" },

      // 4️⃣ Search filter
      {
        $match: {
          "product.isActive": true,
          $or: [
            { "product.productName": regex },
            { "product.category": regex },
            { "shop.shopName": regex }
          ]
        }
      },

      // 5️⃣ Add nearby flag
      {
        $addFields: {
          isNearby: { $lte: ["$distance", 5] } // within 5 KM
        }
      },

      // 6️⃣ Final output
      {
        $project: {
          _id: "$product._id",
          productName: "$product.productName",
          price: "$product.price",
          images: "$product.images",
          shopId: {
            _id: "$shop._id",
            shopName: "$shop.shopName"
          },
          distance: { $round: ["$distance", 2] },
          isNearby: 1
        }
      }
    ]);

    res.json({ success: true, data: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

export default router;
