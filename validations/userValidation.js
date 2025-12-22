import { z } from "zod/v3"

export const userValidation = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters long").max(50, "Name is too long"),

  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .min(5, "Email must be at least 5 characters long"),

  phone: z
    .string()
    .trim()
    .regex(
      /^(\+91)?[6-9]\d{9}$/,
      "Invalid Indian phone number. Must be 10 digits and start with 6, 7, 8, or 9"
    ),

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

  terms: z.boolean().default(false)
});

export const userLoginValidation = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .min(5, "Email must be at least 5 characters long"),

  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters long")
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

export const userUpdateValidation = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters long").max(50, "Name is too long"),

  phone: z
    .string()
    .trim()
    .regex(
      /^(\+91)?[6-9]\d{9}$/,
      "Invalid Indian phone number. Must be 10 digits and start with 6, 7, 8, or 9"
    )
});

export const userPasswordValidation = z.object({
  new: z
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
  old: z
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