export const otpValidation = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/),

  otp: z.string().length(6, "OTP must be 6 digits")
});
