import { z } from 'zod';

export const adminLoginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional()
});

export const staffLoginSchema = z.object({
  employeeId: z.string().min(1),
  password: z.string().min(1),
  businessId: z.number().int().positive().optional(),
  rememberMe: z.boolean().optional()
});

export const signupSchema = z.object({
  businessName: z.string().min(1),
  ownerFullName: z.string().min(1),
  ownerPhone: z.string().min(1),
  ownerEmail: z.string().email().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  password: z.string().min(8),
  address: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  moduleKey: z.string().min(1),
  planName: z.string().min(1),
  subscription: z
    .object({
      status: z.enum(['paid', 'trial', 'pending', 'expired', 'cancelled']).optional(),
      months: z.number().int().positive().optional(),
      discountPercent: z.number().int().min(0).max(100).optional(),
      amountPaid: z.number().int().min(0).optional(),
      paymentReference: z.string().min(1).optional(),
      paymentProvider: z.string().optional(),
      paymentPhone: z.string().optional(),
      startedAt: z.string().datetime().optional(),
      endsAt: z.string().datetime().optional(),
      trialEndsAt: z.string().datetime().optional().nullable()
    })
    .optional()
});

export const passwordResetRequestSchema = z.object({
  phone: z.string().min(1),
  otp: z.string().min(4)
});

export const passwordResetConfirmSchema = z.object({
  phone: z.string().min(1),
  otp: z.string().min(4),
  newPassword: z.string().min(8)
});
