"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetConfirmSchema = exports.passwordResetRequestSchema = exports.signupSchema = exports.staffLoginSchema = exports.adminLoginSchema = void 0;
const zod_1 = require("zod");
exports.adminLoginSchema = zod_1.z.object({
    phone: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
    rememberMe: zod_1.z.boolean().optional()
});
exports.staffLoginSchema = zod_1.z.object({
    employeeId: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
    businessId: zod_1.z.number().int().positive().optional(),
    rememberMe: zod_1.z.boolean().optional()
});
exports.signupSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(1),
    ownerFullName: zod_1.z.string().min(1),
    ownerPhone: zod_1.z.string().min(1),
    ownerEmail: zod_1.z.string().email().optional().or(zod_1.z.literal('')).transform((v) => (v ? v : undefined)),
    password: zod_1.z.string().min(8),
    address: zod_1.z.string().optional(),
    currency: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    moduleKey: zod_1.z.string().min(1),
    planName: zod_1.z.string().min(1),
    subscription: zod_1.z
        .object({
        status: zod_1.z.enum(['paid', 'trial', 'pending', 'expired', 'cancelled']).optional(),
        months: zod_1.z.number().int().positive().optional(),
        discountPercent: zod_1.z.number().int().min(0).max(100).optional(),
        amountPaid: zod_1.z.number().int().min(0).optional(),
        paymentReference: zod_1.z.string().min(1).optional(),
        paymentProvider: zod_1.z.string().optional(),
        paymentPhone: zod_1.z.string().optional(),
        startedAt: zod_1.z.string().datetime().optional(),
        endsAt: zod_1.z.string().datetime().optional(),
        trialEndsAt: zod_1.z.string().datetime().optional().nullable()
    })
        .optional()
});
exports.passwordResetRequestSchema = zod_1.z.object({
    phone: zod_1.z.string().min(1),
    otp: zod_1.z.string().min(4)
});
exports.passwordResetConfirmSchema = zod_1.z.object({
    phone: zod_1.z.string().min(1),
    otp: zod_1.z.string().min(4),
    newPassword: zod_1.z.string().min(8)
});
