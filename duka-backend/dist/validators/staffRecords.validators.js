"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchStaffRecordSchema = exports.createStaffRecordSchema = void 0;
const zod_1 = require("zod");
exports.createStaffRecordSchema = zod_1.z
    .object({
    employeeId: zod_1.z.string().optional(),
    fullName: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional(),
    status: zod_1.z.enum(['live', 'suspended', 'retired']).optional(),
    age: zod_1.z.number().int().positive(),
    nationalId: zod_1.z.string().min(1),
    placeFrom: zod_1.z.string().optional(),
    salaryPerMonth: zod_1.z.number().int().nonnegative(),
    allowance: zod_1.z.number().int().nonnegative().optional(),
    date: zod_1.z.string().min(1),
    message: zod_1.z.string().optional()
})
    .strict();
exports.patchStaffRecordSchema = zod_1.z
    .object({
    fullName: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional(),
    status: zod_1.z.enum(['live', 'suspended', 'retired']).optional(),
    age: zod_1.z.number().int().positive().optional(),
    nationalId: zod_1.z.string().min(1).optional(),
    placeFrom: zod_1.z.string().optional(),
    salaryPerMonth: zod_1.z.number().int().nonnegative().optional(),
    allowance: zod_1.z.number().int().nonnegative().optional(),
    date: zod_1.z.string().min(1).optional(),
    message: zod_1.z.string().optional()
})
    .strict();
