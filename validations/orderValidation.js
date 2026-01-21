import { z } from "zod/v3"

export const orderValidation = z.object({
  shopId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),

  items: z.array(
    z.object({
      productId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
      quantity: z.number().min(1).optional(),
    }).optional()
  ).optional(),

  customization: z.object({
    weight: z.string().optional(),
    flavor: z.string().optional(),
    theme: z.string().optional(),
    notes: z.string().optional()
  }).optional(),

  totalAmount: z.number().nonnegative("Please enter the positive number").optional(),

  paymentStatus: z.enum(["pending", "paid", "failed"]).optional(),

  orderStatus: z
    .enum(["pending", "accepted", "preparing", "on-the-way", "delivered", "cancelled"])
    .optional()
});
