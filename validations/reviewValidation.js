export const reviewValidation = z.object({
  clientId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  shopId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  rating: z.number().min(1).max(5),

  comment: z.string().optional()
});
