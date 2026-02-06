import { z } from "zod/v3"

// 1. Simple Registration Validation (No Address)
export const userRegistrationValidation = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters long").max(50, "Name is too long"),
  email: z.string().trim().email("Invalid email format"),
  phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Invalid phone number"),
  password: z.string().trim().min(6, "Password must be at least 6 characters"),
  terms: z.boolean().refine(val => val === true, "You must accept the terms"),
});

// 2. Standalone Address Validation (For "Add Address" page)
export const addressValidation = z.object({
  flatNo: z.string().trim().min(1, "Flat/House No is required"),
  buildingName: z.string().trim().min(2, "Building Name is required"),
  area: z.string().trim().min(3, "Area is required"),
  city: z.string().trim().min(2, "City is required"),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Invalid 6-digit Pincode"),
  state: z.string().trim().min(2, "State is required")
});

export const userLoginValidation = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().trim().min(1, "Password is required"),
});

export const userUpdateValidation = z.object({
  name: z.string().trim().min(3).optional(),
  phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/).optional()
});

export const userPasswordValidation = z.object({
  new: z.string().min(4),
  old: z.string().min(1)
});