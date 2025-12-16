import { ReviewModel } from "../models/reviewModel.js";
import { orderModel } from "../models/OrderModel.js";
import { ProductModel } from "../models/ProductModel.js";
import { ShopModel } from "../models/ShopModel.js";

export async function addReview(req, res) {
    try {
        const userId = req.user._id;
        const { orderId, productId, rating, comment } = req.body;

        // 1️⃣ Check order
        const order = await orderModel.findOne({
            _id: orderId,
            userId,
            orderStatus: "delivered"
        });

        if (!order) {
            return res.status(403).json({
                success: false,
                message: "Order not delivered or unauthorized"
            });
        }

        // 2️⃣ Prevent duplicate review
        const alreadyReviewed = await ReviewModel.findOne({ orderId });
        if (alreadyReviewed) {
            return res.status(409).json({
                success: false,
                message: "Review already submitted"
            });
        }

        // 3️⃣ Save review
        const review = await ReviewModel.create({
            userId,
            orderId,
            productId,
            rating,
            comment
        });

        // 4️⃣ Recalculate average rating
        const stats = await ReviewModel.aggregate([
            { $match: { productId: order.items[0].productId } },
            {
                $group: {
                    _id: "$productId",
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 }
                }
            }
        ]);

        await ProductModel.findByIdAndUpdate(productId, {
            averageRating: stats[0].avgRating,
            reviewCount: stats[0].count
        });

        return res.status(201).json({
            success: true,
            message: "Review added successfully",
            data: review
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
}

export async function getProductReviews(req, res) {
  try {
    const { productId } = req.params;

    const reviews = await ReviewModel.find({ productId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: reviews
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load reviews" });
  }
}

