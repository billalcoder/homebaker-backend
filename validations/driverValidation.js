export const driverValidation = z.object({
  name: z.string().min(3),

  email: z.string().email().optional(),

  phone: z.string().regex(/^[6-9]\d{9}$/),

  password: z.string().min(8),

  licenceNumber: z.string().trim().min(5),

  terms: z.boolean().refine(v => v === true),

  location: z
    .object({
      latitude: z.number(),
      longitude: z.number()
    })
    .optional()
});
