"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    employeeId: zod_1.z.string().optional(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.enum(['manager', 'cashier', 'attendant', 'staff']),
    workspaceId: zod_1.z.number().int().positive().nullable().optional(),
    isActive: zod_1.z.boolean().optional()
});
exports.patchUserSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    employeeId: zod_1.z.string().optional(),
    role: zod_1.z.enum(['manager', 'cashier', 'attendant', 'staff']).optional(),
    workspaceId: zod_1.z.number().int().positive().nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
    password: zod_1.z.string().min(8).optional()
})
    .strict();
