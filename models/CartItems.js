import mongoose from "mongoose"

const cartSchema = new mongoose.Schema(
    {
        cartId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cart",
            required: true
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        quantity: { type: Number, default: 1 },

        price: { type: Number, required: true }
    },
    { timestamps: true }
);

export const cartItemsModel = mongoose.model("CartItem", cartSchema);
