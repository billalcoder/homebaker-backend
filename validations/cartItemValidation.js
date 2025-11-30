export const cartItemValidation = z.object({
  cartId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  productId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  quantity: z.number().min(1),

  price: z.number().positive()
});
