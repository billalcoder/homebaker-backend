import { z } from "zod/v3";

const stripTags = (str) => str.replace(/<[^>]*>?/gm, "");

export const productValidation = z.object({
  shopId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid shop ID"),

  clientId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid client ID"),

  productName: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters long")
    .transform((val) => stripTags(val)),

  productDescription: z
    .string()
    .trim()
    .transform((val) => (val ? stripTags(val) : ""))
    .optional(),

  price: z
    .number({
      required_error: "Price is required",
      invalid_type_error: "Price must be a number",
    })
    .min(1, "Price must be at least ₹1"),

  images: z
    .array(z.string().url("Invalid image URL"))
    .default([]),

  stock: z
    .number()
    .min(0, "Stock cannot be negative")
    .default(10),

  unitType: z.enum(["kg", "quantity"], {
    required_error: "Unit type is required",
  }),

  unitValue: z
    .number({
      required_error: "Unit value is required",
      invalid_type_error: "Unit value must be a number",
    })
    .min(1, "Unit value must be at least 1"),

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

  isActive: z.boolean().default(true),
  isBestProduct: z.boolean().default(false),
});


export const productIdValidation = z.object({
  productId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid client ID"),

  quantity: z.number().min(1).default(1)
});
