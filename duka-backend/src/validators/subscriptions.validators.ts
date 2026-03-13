import { z } from 'zod';

export const selectPlanSchema = z.object({
  planName: z.string().min(1),
  status: z.enum(['paid', 'trial', 'pending', 'expired', 'cancelled']).optional(),
  months: z.number().int().positive().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  paymentProvider: z.string().optional(),
  paymentPhone: z.string().optional(),
  amountPaid: z.number().int().min(0).optional(),
  startedAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  trialEndsAt: z.string().datetime().optional().nullable()
});

export const confirmPaymentSchema = z.object({
  planName: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  reference: z.string().min(1).optional(),
  amount: z.number().int().min(0),
  provider: z.string().optional(),
  phoneNumber: z.string().optional(),
  months: z.number().int().positive().optional(),
  discountPercent: z.number().int().min(0).max(100).optional()
});
