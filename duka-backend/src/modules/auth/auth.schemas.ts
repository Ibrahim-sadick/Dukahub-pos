import { z } from 'zod';

export const registerOwnerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(9),
  password: z.string().min(8),
  businessName: z.string().min(2),
  businessModule: z.string().default('retail_supermarket'),
  subscriptionPlan: z.string().optional(),
  subscriptionPaymentStatus: z.string().optional(),
  subscriptionStartedAt: z.string().datetime().optional(),
  subscriptionEndsAt: z.string().datetime().optional(),
  subscriptionTrialEndsAt: z.string().datetime().optional(),
  subscriptionBillingCycle: z.string().optional(),
  subscriptionDurationDays: z.coerce.number().int().nonnegative().optional(),
  subscriptionMonths: z.coerce.number().int().nonnegative().optional(),
  subscriptionDiscountPercent: z.coerce.number().nonnegative().optional(),
  subscriptionRawMonthlyPrice: z.coerce.number().nonnegative().optional(),
  subscriptionAmountPaid: z.coerce.number().nonnegative().optional(),
  paymentProvider: z.string().optional(),
  paymentPhone: z.string().optional(),
  paymentReference: z.string().optional()
});

export const ownerLoginSchema = z.object({
  phone: z.string().min(9),
  password: z.string().min(1)
});

export const phoneAvailabilitySchema = z.object({
  phone: z.string().min(9)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export const passwordResetRequestSchema = z.object({
  phone: z.string().min(9),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code')
});

export const passwordResetConfirmSchema = z.object({
  challengeId: z.string().min(10),
  phone: z.string().min(9),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
  newPassword: z.string().min(8)
});
