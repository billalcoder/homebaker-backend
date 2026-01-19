import {z} from "zod/v3"

export const orderValidation = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  shopId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  items: z.array(
    z.object({
      productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      quantity: z.number().min(1),
      price: z.number().positive()
    }).optional()
  ),

  customization: z.object({
    weight: z.string().min(1, "Weight is required"),
    flavor: z.string().min(1, "Flavor is required"),
    theme: z.string().min(1, "Theme is required"),
    notes: z.string().optional()
  }).optional(),

  totalAmount: z.number().nonnegative("Please enter the positive number"),

  paymentStatus: z.enum(["pending", "paid", "failed"]).optional(),

  orderStatus: z
    .enum(["pending", "accepted", "preparing", "on-the-way", "delivered", "cancelled"])
    .optional()
});
