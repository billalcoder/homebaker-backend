export const cartValidation = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/)
});
