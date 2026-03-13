import { z } from 'zod';

export const createStaffRecordSchema = z
  .object({
    employeeId: z.string().optional(),
    fullName: z.string().min(1),
    email: z.string().email().optional(),
    status: z.enum(['live', 'suspended', 'retired']).optional(),
    age: z.number().int().positive(),
    nationalId: z.string().min(1),
    placeFrom: z.string().optional(),
    salaryPerMonth: z.number().int().nonnegative(),
    allowance: z.number().int().nonnegative().optional(),
    date: z.string().min(1),
    message: z.string().optional()
  })
  .strict();

export const patchStaffRecordSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    status: z.enum(['live', 'suspended', 'retired']).optional(),
    age: z.number().int().positive().optional(),
    nationalId: z.string().min(1).optional(),
    placeFrom: z.string().optional(),
    salaryPerMonth: z.number().int().nonnegative().optional(),
    allowance: z.number().int().nonnegative().optional(),
    date: z.string().min(1).optional(),
    message: z.string().optional()
  })
  .strict();

