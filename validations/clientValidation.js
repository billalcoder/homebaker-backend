import { z } from "zod/v3"

export const clientValidation = z.object({
  name: z.string().trim().min(3),
  email: z.string().email().trim(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Phone Number"),
  password: z
    .string()
    .trim()
    .min(4, "Password must be at least 4 characters long")
    .refine(
      (val) =>
        /[A-Z]/.test(val) && // at least one uppercase
        /[a-z]/.test(val) && // at least one lowercase
        /[0-9]/.test(val) && // at least one number
        /[@$!%*?&#]/.test(val), // at least one special character
      {
        message:
          "Password must include uppercase, lowercase, number, and special character",
      }
    ),
  terms: z.boolean().refine(v => v === true, "Accept terms required")
});

// export const clientProfileUpdateValidation = z.object({
//   shopName: z.string().min(2).optional(),
//   shopDescription: z.string().max(300, "Bio too long").optional(),
//   shopCategory: z.string().optional(),

//   address: z.string().min(5).optional(),
//   city: z.string().optional(),
//   pincode: z.string().regex(/^\d{6}$/, "Invalid Pincode").optional(),

//   // Validate URLs if provided, allow empty strings
//   profileImage: z.string().url().or(z.literal("")).optional(),

//   socialLinks: z.object({
//     instagram: z.string().optional(),
//     whatsapp: z.string().regex(/^\d{10}$/, "Invalid WhatsApp").or(z.literal("")).optional(),
//     website: z.string().url().or(z.literal("")).optional()
//   }).optional()
// });

export const clientLoginValidation = z.object({

  email: z.string().email().trim(),

  password: z
    .string()
    .trim()
    .min(4, "Password must be at least 4 characters long")
    .refine(
      (val) =>
        /[A-Z]/.test(val) && // at least one uppercase
        /[a-z]/.test(val) && // at least one lowercase
        /[0-9]/.test(val) && // at least one number
        /[@$!%*?&#]/.test(val), // at least one special character
      {
        message:
          "Password must include uppercase, lowercase, number, and special character",
      }
    ),
});

export const clientUpdateValidation = z.object({
  name: z.string().trim().min(3),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Phone Number"),
});
