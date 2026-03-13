import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  employeeId: z.string().optional(),
  password: z.string().min(8),
  role: z.enum(['manager', 'cashier', 'attendant', 'staff']),
  workspaceId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional()
});

export const patchUserSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    employeeId: z.string().optional(),
    role: z.enum(['manager', 'cashier', 'attendant', 'staff']).optional(),
    workspaceId: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).optional()
  })
  .strict();
