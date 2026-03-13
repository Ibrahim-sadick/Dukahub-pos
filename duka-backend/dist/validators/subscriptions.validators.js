"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPaymentSchema = exports.selectPlanSchema = void 0;
const zod_1 = require("zod");
exports.selectPlanSchema = zod_1.z.object({
    planName: zod_1.z.string().min(1),
    status: zod_1.z.enum(['paid', 'trial', 'pending', 'expired', 'cancelled']).optional(),
    months: zod_1.z.number().int().positive().optional(),
    discountPercent: zod_1.z.number().int().min(0).max(100).optional(),
    paymentProvider: zod_1.z.string().optional(),
    paymentPhone: zod_1.z.string().optional(),
    amountPaid: zod_1.z.number().int().min(0).optional(),
    startedAt: zod_1.z.string().datetime().optional(),
    endsAt: zod_1.z.string().datetime().optional(),
    trialEndsAt: zod_1.z.string().datetime().optional().nullable()
});
exports.confirmPaymentSchema = zod_1.z.object({
    planName: zod_1.z.string().min(1).optional(),
    planId: zod_1.z.string().min(1).optional(),
    reference: zod_1.z.string().min(1).optional(),
    amount: zod_1.z.number().int().min(0),
    provider: zod_1.z.string().optional(),
    phoneNumber: zod_1.z.string().optional(),
    months: zod_1.z.number().int().positive().optional(),
    discountPercent: zod_1.z.number().int().min(0).max(100).optional()
});
