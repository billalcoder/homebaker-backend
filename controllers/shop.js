import mongoose from "mongoose";
import { ProductModel } from "../models/ProductModel.js";
import { ShopModel } from "../models/ShopModel.js"
import { orderModel } from "../models/OrderModel.js";
import { ClientModel } from "../models/ClientModel.js";

export async function getShop(req, res, next) {
  try {
    const { latitude, longitude } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // --- FALLBACK: NO LOCATION ---
    if (!latitude || !longitude) {
      const shops = await ShopModel.find({
        isActive: true,
        shopName: { $exists: true, $ne: "Unnamed Shop" },
        coverImage: { $exists: true, $ne: "" },
        productCount: { $gte: 3 }
      })
        .select("shopName shopDescription shopCategory city coverImage profileImage totalReviews")
        .sort({ createdAt: -1 }) // ✅ ADD THIS: Stable sorting prevents duplicates
        .skip(skip)
        .limit(limit);

      const normalized = shops.map(shop => ({ shop, distanceInKm: null }));

      return res.json({
        success: true,
        count: normalized.length,
        pagination: {
          shopd : shops.length,
          page, // ✅ Ensure this matches frontend check
          limit,
          totalPages: Math.ceil(shops.length / limit)
        },
        shops: normalized
      });
    }

    // --- WITH LOCATION (Geo Search) ---
    const results = await ClientModel.aggregate([
      // 1. Find nearby clients
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          distanceField: "distance",
          maxDistance: 12000,
          spherical: true
        }
      },
      // 2. Join with Shops
      { $lookup: { from: "shops", localField: "_id", foreignField: "clientId", as: "shop" } },

      // 3. Ensure shop exists
      { $match: { "shop.0": { $exists: true } } },

      // 4. Flatten the array         
      { $unwind: "$shop" },

      // 5. Filter for Active & Completed Profile
      {
        $match: {
          "shop.isActive": true,
          "shop.shopName": { $exists: true, $ne: "Unnamed Shop" },
          "shop.coverImage": { $exists: true, $ne: "" },
          "shop.productCount": { $gte: 3 }
        }
      },

      // 6. Sort
      { $sort: { distance: 1, _id: 1 } },

      // 7. Pagination Facet
      {
        $facet: {
          data: [
            { $addFields: { distanceInKm: { $round: [{ $divide: ["$distance", 1000] }, 2] } } },
            { $project: { shop: "$shop", distanceInKm: 1 } },
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ]);

    const shops = results[0].data || [];
    const total = results[0].totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      count: shops.length,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      shops
    });

  } catch (error) {
    next(error);
  }
}

export async function status(req, res, next) {
  try {
    // Assuming req.clientId or req.user._id is available from middleware
    const shop = await ShopModel.findOne({ clientId: req.user._id });

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    res.json({ status: shop.isActive });
  } catch (error) {
    next(error)
  }
}

export async function toggle(req, res, next) {
  try {
    const shop = await ShopModel.findOne({ clientId: req.user._id });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Toggle logic
    shop.isActive = shop.isActive === true ? false : true;
    await shop.save();

    res.json({
      message: `Shop is now ${shop.isActive}`,
      status: shop.isActive
    });

  } catch (error) {
    next(error)
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

    const products = await ProductModel.find({ shopId: shopId, isActive: true });
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

    const product = await ProductModel.findById(id).populate("shopId", "portfolio");

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





