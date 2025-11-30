export const orderValidation = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  shopId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  items: z.array(
    z.object({
      productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      quantity: z.number().min(1),
      price: z.number().positive()
    })
  ),

  totalAmount: z.number().positive(),

  paymentStatus: z.enum(["pending", "paid", "failed"]).optional(),

  orderStatus: z
    .enum(["pending", "accepted", "preparing", "on-the-way", "delivered", "cancelled"])
    .optional()
});
