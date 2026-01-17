import mongoose from "mongoose";
import { orderModel } from "../models/OrderModel.js";
import { ProductModel } from "../models/ProductModel.js";
import { productIdValidation } from "../validations/productValidation.js";
import { ShopModel } from "../models/ShopModel.js";
import { sendNewOrderAlertMail, sendOrderStatusMail } from "../utils/otp.js";

export async function createOrder(req, res, next) {
    try {
        const userdata = req.user;
        // 1️⃣ Validate input
        const dirtyData = productIdValidation.safeParse(req.body);
        if (!dirtyData.success) {
            return res.status(400).json({
                success: false,
                error: dirtyData.error
            });
        }

        const { productId, quantity } = dirtyData.data;

        // 2️⃣ Prevent duplicate active order
        const existingOrder = await orderModel.findOne({
            userId: userdata._id,
            orderStatus: "pending",
            "items.productId": productId
        });

        if (existingOrder) {
            return res.status(409).json({
                success: false,
                message: "You already have an active order for this product"
            });
        }

        // 3️⃣ Fetch product + baker
        const productData = await ProductModel.findById(productId)
            .populate("shopId", "shopName")
            .populate("clientId", "name email phone");

        if (!productData) {
            return res.status(404).json({
                success: false,
                error: "Product not found"
            });
        }

        // 4️⃣ Create order
        const order = await orderModel.create({
            shopId: productData.shopId._id,
            userId: userdata._id,
            items: [{ productId, price: productData.price, quantity }],
            totalAmount: productData.price * quantity,
            orderStatus: "pending"
        });

        // 5️⃣ Increase shop order count
        await ShopModel.findByIdAndUpdate(
            productData.shopId._id,
            { $inc: { totalOrder: 1 } }
        );

        // 6️⃣ Send email to baker (NON-BLOCKING)
        sendNewOrderAlertMail({
            bakerEmail: productData.clientId.email,
            bakerName: productData.clientId.name,
            shopName: productData.shopId.shopName,
            orderId: order._id,
            productName: productData.productName,
            quantity,
            totalAmount: order.totalAmount
        }).catch(console.error);

        // 7️⃣ Populate response
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
        next(err);
    }
}

const statusFlow = {
    pending: ["preparing", "cancelled"],
    preparing: ["on-the-way", "cancelled"],
    "on-the-way": ["delivered"],
    delivered: [],
    cancelled: []
};

export async function updateStatus(req, res, next) {
    try {
        const { orderId, status } = req.body;

        // 1️⃣ Validate input
        if (!orderId || !status) {
            return res.status(400).json({
                success: false,
                message: "OrderId and status are required"
            });
        }

        // 2️⃣ Find order + user email
        const order = await orderModel
            .findById(orderId)
            .populate("userId", "email");

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // 3️⃣ Validate status transition
        const currentStatus = order.orderStatus;
        const allowedNextStatus = statusFlow[currentStatus];

        if (!allowedNextStatus || !allowedNextStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${currentStatus} to ${status}`
            });
        }

        // 4️⃣ Update status
        order.orderStatus = status;
        await order.save();

        // 5️⃣ Send email (async, non-blocking)
        sendOrderStatusMail({
            userEmail: order.userId.email,
            orderId: order._id,
            oldStatus: currentStatus,
            newStatus: status
        }).catch(console.error);

        // 6️⃣ Response
        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            order
        });

    } catch (err) {
        next(err);
    }
}

export async function getOrder(req, res, next) {
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
        next(err)
    }
}

export async function getMyOrders(req, res, next) {
    try {
        const user = req.user;

        const orders = await orderModel.find({ userId: user._id })
            .populate({ path: "shopId", select: "shopName" }).populate({ path: "items.productId" })
            .select("-__v")
            .sort({ createdAt: -1 });

        res.json({ success: true, data: orders });
    } catch (err) {
        console.error(err);
        next(err)
    }
}

export async function getShopOrders(req, res, next) {
    try {
        const user = req.user;

        const shopData = await ShopModel.findOne({ clientId: user._id }).lean()
        if (!shopData) {
            return res.status(403).json({ success: false, error: "Only shop owners can access this" });
        }

        const orders = await orderModel.find({ shopId: shopData._id }).lean()
            .populate({ path: "userId", select: "name email phone address" })
            .populate({
                path: "items.productId",
                model: "Product",
                select: "productName images"
            })
            .sort({ createdAt: -1 });
        res.json({ success: true, length: orders.length, data: orders });
    } catch (err) {
        console.error(err);
        next(err)
    }
}

export async function getShopLength(req, res, next) {
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
        next(err)
    }
}

export async function deleteOrder(req, res, next) {
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
        next(err)
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
