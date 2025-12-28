import mongoose from "mongoose";
import { orderModel } from "../models/OrderModel.js";
import { ProductModel } from "../models/ProductModel.js";
import { productIdValidation } from "../validations/productValidation.js";
import { ShopModel } from "../models/ShopModel.js";

export async function createOrder(req, res) {
    try {
        const userdata = req.user;

        // Validate input
        const dirtyData = productIdValidation.safeParse(req.body);
        if (!dirtyData.success) {
            return res.status(400).json({
                success: false,
                error: dirtyData.error
            });
        }

        const { productId, quantity } = dirtyData.data;

        // 🔒 Prevent duplicate active order
        const existingOrder = await orderModel.findOne({
            userId: userdata._id,
            orderStatus: { $in: ["pending"] },
            "items.productId": productId
        });

        if (existingOrder) {
            return res.status(409).json({
                success: false,
                message: "You already have an active order for this product"
            });
        }

        // Fetch product
        const productData = await ProductModel.findById(productId)
            .populate("shopId", "shopName")
            .populate("clientId", "name email phone");

        if (!productData) {
            return res.status(404).json({
                success: false,
                error: "Product not found"
            });
        }

        // Create order
        const order = await orderModel.create({
            shopId: productData.shopId._id,
            userId: userdata._id,
            items: [{ productId, price: productData.price, quantity }],
            totalAmount: productData.price * quantity,
            orderStatus: "pending"
        });

        const increaseOrder = await ShopModel.findById(productData.shopId._id);

        if (!increaseOrder) {
            throw new Error("Shop not found");
        }

        increaseOrder.totalOrder += 1;
        await increaseOrder.save();

        const populatedOrder = await orderModel
            .findById(order._id)
            .populate("shopId")
            .populate({ path: "userId", select: "-password" });

        return res.status(201).json({
            success: true,
            data: populatedOrder
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Server Error"
        });
    }
}

const statusFlow = {
  pending: ["preparing", "cancelled"],
  preparing: ["on-the-way", "cancelled"],
  "on-the-way": ["delivered"],
  delivered: [],
  cancelled: []
};

export async function updateStatus(req, res) {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "OrderId and status are required"
      });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const allowedNextStatus = statusFlow[order.orderStatus];

    if (!allowedNextStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.orderStatus} to ${status}`
      });
    }

    order.orderStatus = status;
    await order.save();

    res.json({
      success: true,
      message: "Order status updated",
      order
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getOrder(req, res) {
    try {
        // const { id } = req.params;
        const user = req.user;

        // Validate ObjectId
        // if (!mongoose.Types.ObjectId.isValid(id)) {
        //     return res.status(400).json({ success: false, error: "Invalid orderId" });
        // }

        const shopData = await ShopModel.findOne({ clientId: user._id })

        // Fetch & populate safely
        const order = await orderModel.find({ userId: user._id })
            .populate({ path: "shopId", select: "shopName _id" })
            .populate({ path: "userId", select: "name email phone" });

        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }
        // Authorization check
        const isBuyer = order.userId._id.toString() === user._id.toString();
        const isShopOwner = order.shopId._id.toString() === shopData?._id.toString();

        if (!isBuyer && !isShopOwner) {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        res.json({ success: true, data: order });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
}

export async function getMyOrders(req, res) {
    try {
        const user = req.user;

        const orders = await orderModel.find({ userId: user._id })
            .populate({ path: "shopId", select: "shopName" }).populate({ path: "items.productId" })
            .select("-__v")
            .sort({ createdAt: -1 });

        res.json({ success: true, data: orders });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
}

export async function getShopOrders(req, res) {
    try {
        const user = req.user;

        const shopData = await ShopModel.findOne({ clientId: user._id }).lean()
        if (!shopData) {
            return res.status(403).json({ success: false, error: "Only shop owners can access this" });
        }

        const orders = await orderModel.find({ shopId: shopData._id }).lean()
            .populate({ path: "userId", select: "name email phone" })
            .populate({
                path: "items.productId",
                model: "Product",
                select: "productName images"
            })
            .sort({ createdAt: -1 });
        res.json({ success: true, length: orders.length, data: orders });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
}

export async function getShopLength(req, res) {
    try {
        const user = req.user;

        const shopData = await ShopModel.findOne({ clientId: user._id }).lean()
        if (!shopData) {
            return res.status(403).json({ success: false, error: "Only shop owners can access this" });
        }

        const orders = await orderModel.find({ shopId: shopData._id }).lean()

        res.json({ success: true, length: orders.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
}

export async function deleteOrder(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid orderId" });
        }

        const order = await orderModel.findById(id).populate("shopId");

        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }

        // Permission check
        const isBuyer = order.userId.toString() === user._id.toString();
        const isShopOwner = order.shopId?._id.toString() === user.shopId?.toString();

        if (!isBuyer && !isShopOwner) {
            return res.status(403).json({ success: false, error: "You cannot delete this order" });
        }

        await order.deleteOne();

        res.json({ success: true, message: "Order deleted successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
}

// export async function getOrderById(req, res) {
//     try {
//         const { id } = req.params;
//         const user = req.user;

//         // Validate ObjectId
//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             return res.status(400).json({ success: false, error: "Invalid orderId" });
//         }

//         const order = await orderModel.findById(id).populate("shopId").populate("userId").select("-password").populate("items.productId");

//         if (!order) {
//             return res.status(404).json({ success: false, error: "Order not found" });
//         }

//         // Permission check
//         // const isBuyer = order.userId?.toString() === user._id?.toString();
//         // const isShopOwner = order.shopId?._id.toString() === user.shopId?.toString();

//         // if (!isBuyer && !isShopOwner) {
//         //     return res.status(403).json({ success: false, error: "You cannot see this order" });
//         // }

//         res.json({ success: true, message: order });

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, error: "Server error" });
//     }
// }
