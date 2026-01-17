import mongoose from "mongoose";
import { ProductModel } from "../models/ProductModel.js";
import { ShopModel } from "../models/ShopModel.js"
import { orderModel } from "../models/OrderModel.js";
import { ClientModel } from "../models/ClientModel.js";

export async function getShop(req, res, next) {
  try {
    const { latitude, longitude } = req.query;

    // ---------------------------------------
    // 🟡 FALLBACK: NO LOCATION
    // ---------------------------------------
    if (!latitude || !longitude) {
      const shops = await ShopModel.find({ isActive: true })
        .select("shopName shopDescription shopCategory city coverImage totalReviews")
        .limit(20);

      // 🔥 Normalize response
      const normalized = shops.map(shop => ({
        shop,
        distanceInKm: null
      }));

      return res.json({
        success: true,
        count: normalized.length,
        shops: normalized
      });
    }

    // ---------------------------------------
    // 🟢 WITH LOCATION (Geo Search)
    // ---------------------------------------
    const shops = await ClientModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [
              parseFloat(longitude),
              parseFloat(latitude)
            ]
          },
          distanceField: "distance",
          spherical: true
        }
      },

      {
        $lookup: {
          from: "shops",
          localField: "_id",
          foreignField: "clientId",
          as: "shop"
        }
      },

      {
        $match: {
          "shop.0": { $exists: true }
        }
      },

      { $unwind: "$shop" },

      {
        $addFields: {
          distanceInKm: {
            $round: [{ $divide: ["$distance", 1000] }, 2]
          }
        }
      },

      // 🔥 Normalize shape
      {
        $project: {
          shop: "$shop",
          distanceInKm: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      count: shops.length,
      shops
    });

  } catch (error) {
    next(error);
  }
}

export async function getShopById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "shopId is required"
      });
    }

    const shop = await ShopModel.findById(id)
      .populate("clientId")        // if you need seller details
      .lean();

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    res.status(200).json({
      success: true,
      shop
    });

  } catch (error) {
    console.error("Get Shop By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

export async function getProduct(req, res, next) {
  try {
    const { shopId } = req.query;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "shopId is required"
      });
    }

    const products = await ProductModel.find({ shopId });

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for this shop"
      });
    }

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    console.error("Get Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "productId is required"
      });
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      product
    });

  } catch (error) {
    console.error("Get Product By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}

export async function createOrder(req, res, next) {
  try {
    const user = req.user; // from auth middleware
    const { shopId, items } = req.body;

    // Basic validation
    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "shopId and items[] are required.",
      });
    }

    // Validate shopId format
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ error: "Invalid shopId format." });
    }

    // Check if shop exists
    const shop = await ShopModel.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Prepare final items array
    const finalItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const { productId, quantity } = item;

      // Validate productId
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: "Invalid productId format." });
      }

      // Fetch product info
      const product = await ProductModel.findById(productId);
      if (!product) {
        return res.status(404).json({ error: `Product ${productId} not found.` });
      }

      const qty = quantity || 1;
      const price = product.price;

      finalItems.push({
        productId,
        quantity: qty,
        price,
      });

      totalAmount += price * qty;
    }

    // Create order
    const order = await orderModel.create({
      userId: user._id,
      shopId,
      items: finalItems,
      totalAmount,
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    return res.status(201).json({
      message: "Order created successfully.",
      order,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductByShopId(req, res, next) {
  try {
    const { shop } = req.params;
    if (!shop) {
      return res.status(400).json({
        success: false,
        message: "Shop ID is required"
      });
    }

    // 1. Find shop
    const shopData = await ShopModel.findById(shop);

    if (!shopData) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }

    // 2. Find all products of this shop
    const products = await ProductModel.find({ shopId: shopData._id });

    return res.status(200).json({
      success: true,
      shop,
      products
    });

  } catch (error) {
    next(error);
  }
}





