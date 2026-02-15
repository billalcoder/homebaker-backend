import mongoose from "mongoose";
import { orderModel } from "../models/OrderModel.js";
import { ProductModel } from "../models/ProductModel.js";
import { productIdValidation } from "../validations/productValidation.js";
import { ShopModel } from "../models/ShopModel.js";
import { sendNewOrderAlertMail, sendOrderConfirmationMail, sendOrderStatusMail } from "../utils/otp.js";
import { orderValidation } from "../validations/orderValidation.js";

export async function createOrder(req, res, next) {
    try {
        const userdata = req.user;
        const { flatNo, buildingName, area, city, pincode, state } = userdata?.address || {};

        if (!flatNo || !buildingName || !area || !city || !pincode || !state) {
            return res.status(422).json({ error: "Please add your address" });
        }

        // Format address for the email
        const fullAddress = `${flatNo}, ${buildingName}, ${area}, ${city} - ${pincode}, ${state}`;

        const { productId } = req.body;

        if (!productId) {
            const validation = orderValidation.safeParse(req.body);

            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    error: validation.error.format()
                });
            }

            const { shopId, customization } = validation.data;

            if (customization) {
                const shopData = await ShopModel.findById(shopId).populate("clientId", "name email");
                if (!shopData) {
                    return res.status(404).json({ success: false, message: "Shop not found" });
                }

                // Create the order with customization details
                const newOrder = await orderModel.create({
                    userId: userdata._id,
                    shopId: shopId,
                    items: [], // Custom orders usually start with an empty item list until baker adds a price
                    customization: {
                        weight: customization.weight,
                        flavor: customization.flavor,
                        theme: customization.theme,
                        notes: customization.notes
                    },
                    totalAmount: 0, // Baker will update this later
                    orderStatus: "pending",
                    paymentStatus: "pending"
                });

                // Update shop total order count
                await ShopModel.findByIdAndUpdate(shopId, { $inc: { totalOrder: 1 } });

                // 📧 Send Emails
                if (shopData.clientId) {
                    const customDetailsSummary = `${customization.weight} ${customization.flavor} cake (${customization.theme || 'No specific theme'})`;

                    // Alert Baker: Custom Request
                    sendNewOrderAlertMail({
                        bakerEmail: shopData.clientId.email,
                        bakerName: shopData.clientId.name,
                        shopName: shopData.shopName,
                        orderId: newOrder._id,
                        productName: `CUSTOM REQUEST: ${customDetailsSummary}`,
                        quantity: 1,
                        totalAmount: "Pending Quote",
                    }).catch(console.error);

                    // Confirm to Customer: Custom Request Received
                    sendOrderConfirmationMail({
                        customerEmail: userdata.email,
                        customerName: userdata.name,
                        orderId: newOrder._id,
                        shopName: shopData.shopName,
                        items: [{
                            productName: `Custom Cake (${customDetailsSummary})`,
                            quantity: 1,
                            price: "TBD"
                        }],
                        totalAmount: "Pending Review (Baker will send a quote soon)",
                        deliveryAddress: fullAddress
                    }).catch(console.error);
                }

                return res.status(201).json({
                    success: true,
                    message: "Custom order request sent! The baker will review and update the price.",
                    data: newOrder
                });
            }
        }

        // ============================================================
        // 🟦 SCENARIO B: STANDARD PRODUCT ORDER
        // ============================================================

        const existingOrder = await orderModel.findOne({
            userId: userdata._id,
            orderStatus: "pending",
            "items.productId": productId
        });

        if (existingOrder) {
            return res.status(409).json({
                success: false,
                message: "You already have an active pending order for this product"
            });
        }

        const productData = await ProductModel.findById(productId)
            .populate("shopId", "shopName")
            .populate("clientId", "name email phone");

        if (!productData) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const order = await orderModel.create({
            shopId: productData.shopId._id,
            userId: userdata._id,
            items: [{
                productId: productData._id,
                price: productData.price,
                productName: productData.productName // Useful for email mapping
            }],
            totalAmount: productData.price,
            orderStatus: "pending"
        });

        await ShopModel.findByIdAndUpdate(
            productData.shopId._id,
            { $inc: { totalOrder: 1 } }
        );

        // 📧 Send Emails for Standard Order
        // Alert Baker
        sendNewOrderAlertMail({
            bakerEmail: productData.clientId.email,
            bakerName: productData.clientId.name,
            shopName: productData.shopId.shopName,
            orderId: order._id,
            productName: productData.productName,
            quantity: 1,
            totalAmount: order.totalAmount
        }).catch(console.error);

        // Confirm to Customer
        sendOrderConfirmationMail({
            customerEmail: userdata.email,
            customerName: userdata.name,
            orderId: order._id,
            shopName: productData.shopId.shopName,
            items: [{ productName: productData.productName, quantity: 1, price: productData.price }],
            totalAmount: order.totalAmount,
            deliveryAddress: fullAddress
        }).catch(console.error);

        const populatedOrder = await orderModel
            .findById(order._id)
            .populate("shopId")
            .populate({ path: "userId", select: "-password" });

        return res.status(201).json({
            success: true,
            data: populatedOrder
        });

    } catch (err) {
        console.error("Create Order Error:", err);
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

        // 1. Fetch Orders with robust population
        const orders = await orderModel.find({ userId: user._id })
            // A. Populate Shop & Owner Details (to get the phone number initially)
            .populate({
                path: "shopId",
                select: "shopName clientId",
                populate: {
                    path: "clientId",
                    select: "name phone" // choose required fields
                } // Fetch Shop Name + Shop Phone
            })
            // B. Populate Products (Logic handles empty items array automatically)
            .populate({
                path: "items.productId",
                select: "productName price images unitType unitValue"
            })
            .select("-__v")
            .sort({ createdAt: -1 });

        // 2. Sanitize Data (Privacy Filter)
        const sanitizedOrders = orders.map(doc => {
            // Convert Mongoose Document -> Plain JS Object so we can 'delete' fields
            const order = doc.toObject();

            // 🔒 PRIVACY LOGIC: Hide contact info if not delivered
            if (order.orderStatus !== 'preparing' && order.orderStatus !== 'on-the-way') {

                if (order.shopId) {
                    // Hide Shop's generic phone number
                    if (order.shopId.clientId.phone) {
                        delete order.shopId.clientId.phone;
                    }
                }
            }

            return order;
        });

        res.json({ success: true, data: sanitizedOrders });

    } catch (err) {
        console.error("Error fetching orders:", err);
        next(err);
    }
}

export async function getShopOrders(req, res, next) {
    try {
        const user = req.user;

        const shopData = await ShopModel.findOne({ clientId: user._id }).lean()
        if (!shopData) {
            return res.status(403).json({ success: false, error: "Only shop owners can access this" });
        }

        const orders = await orderModel.find({ shopId: shopData._id })
            .populate({ path: "userId", select: "name email address" })
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

export const cancelOrder = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { orderId } = req.params;

        const order = await orderModel.findOne({
            _id: orderId,
            userId
        });

        if (!order) {
            return res.status(404).json({
                error: "Order not found"
            });
        }

        // ❌ Only preparing orders can be cancelled
        if (order.orderStatus !== "preparing") {
            return res.status(400).json({
                error: "Order cannot be cancelled at this stage"
            });
        }

        // ⏰ Time check (1 hour)
        const ONE_HOUR = 60 * 60 * 1000;
        const orderTime = new Date(order.createdAt).getTime();
        const now = Date.now();

        if (now - orderTime > ONE_HOUR) {
            return res.status(400).json({
                error: "Cancellation window expired"
            });
        }

        // ✅ Cancel order
        order.orderStatus = "cancelled";
        await order.save();

        return res.json({
            success: true,
            message: "Order cancelled successfully"
        });

    } catch (error) {
        next(error);
    }
};

export const updatePrice = async (req, res, next) => {
    const { orderId, totalAmount } = req.body
    const userId = req.user._id
    const order = await orderModel.findById(orderId)
    order.totalAmount = totalAmount
    order.save()
    res.status(201).json({ success: true, message: "price updated successfully" })

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
