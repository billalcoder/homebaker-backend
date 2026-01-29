import { z } from "zod/v3";

const stripTags = (str) => str.replace(/<[^>]*>?/gm, '');

export const shopValidation = z.object({
  clientId: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid client ID"),

  shopName: z.string().min(2).optional().transform((val) => (val ? stripTags(val) : "")),
  shopDescription: z.string().max(300, "Bio too long").optional().transform((val) => (val ? stripTags(val) : "")),
  shopCategory: z.string().optional().transform((val) => (val ? stripTags(val) : "")),

  address: z.string().min(5).optional().transform((val) => (val ? stripTags(val) : "")),
  city: z.string().optional().transform((val) => (val ? stripTags(val) : "")),
  pincode: z.string().regex(/^\d{6}$/, "Invalid Pincode").optional().transform((val) => (val ? stripTags(val) : "")),

  // Validate URLs if provided, allow empty strings
  profileImage: z.string().url().or(z.literal("")).optional().transform((val) => (val ? stripTags(val) : "")),

  socialLinks: z.object({
    instagram: z.string().optional(),
    whatsapp: z.string().regex(/^\d{10}$/, "Invalid WhatsApp").or(z.literal("")).optional(),
    website: z.string().url().or(z.literal("")).optional()
  }).optional().transform((val) => (val ? stripTags(val) : "")),

  portfolio: z.array(z.object({
    imageUrl: z.string().optional(),
    title: z.string().trim().optional().transform((val) => (val ? stripTags(val) : "")),

    category: z
      .enum([
        "Cake",
        "Pastry",
        "Cookies",
        "Bread",
        "Brownie",
        "Donuts",
        "Chocolates",
        "Snacks",
        "Others",
      ])
      .default("Others"),

    unitType: z.enum(["kg", "quantity"], {
      required_error: "Unit type is required",
    }),

    status: z.enum([
      "active",
      "inactive"
    ]).default("inactive"),

    unitValue: z
      .number({
        required_error: "Unit value is required",
        invalid_type_error: "Unit value must be a number",
      })
      .min(1, "Unit value must be at least 1"),

    price: z.string().min(1, "Price should be positive").optional().transform((val) => (val ? stripTags(val) : ""))
  })).optional().transform((val) => (val ? stripTags(val) : "")),

});
