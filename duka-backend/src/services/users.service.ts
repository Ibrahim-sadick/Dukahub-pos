import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/httpError';
import { normalizeTzPhone } from '../utils/phone';
import { hashPassword } from '../utils/password';
import { roles } from './auth.service';

const toIso = (d: Date) => d.toISOString();

export async function listUsers(businessId: number) {
  const users = await prisma.user.findMany({
    where: { businessId },
    orderBy: [{ role: 'asc' }, { id: 'asc' }]
  });
  return users.map((u) => sanitize(u));
}

export async function createUser(businessId: number, input: any) {
  const role = roles.toUserRole(String(input.role || 'staff'));
  if (role === UserRole.ADMIN) throw new HttpError(400, 'INVALID_ROLE', 'Use signup to create admin accounts');

  const active = input.isActive !== false;
  if (active) {
    const sub = await prisma.subscription.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' }
    });
    const endsAt = sub?.endsAt ? new Date(sub.endsAt).getTime() : 0;
    const now = Date.now();
    const subStatus = String(sub?.status || '').toUpperCase();
    const expired = !endsAt || now > endsAt || subStatus === 'PENDING' || subStatus === 'CANCELLED' || subStatus === 'EXPIRED';
    if (expired) throw new HttpError(403, 'SUBSCRIPTION_EXPIRED', 'Subscription expired. Renew plan to add staff');

    const limit = Number(sub?.userLimit ?? 0);
    if (!limit) throw new HttpError(403, 'SUBSCRIPTION_REQUIRED', 'Active subscription is required to add staff');

    const currentCount = await prisma.user.count({ where: { businessId, isActive: true } });
    if (currentCount >= limit) {
      throw new HttpError(403, 'USER_LIMIT_REACHED', `User limit reached (${limit}). Upgrade or renew your plan`, {
        maxUsers: limit,
        currentUsers: currentCount
      });
    }
  }

  const passwordHash = await hashPassword(String(input.password || ''));
  const employeeId = input.employeeId ? String(input.employeeId).trim() : null;
  if (!employeeId) throw new HttpError(400, 'EMPLOYEE_ID_REQUIRED', 'employeeId is required for staff accounts');

  const phoneNormalized = input.phone ? normalizeTzPhone(String(input.phone)) : null;
  if (input.phone && !phoneNormalized) throw new HttpError(400, 'INVALID_PHONE', 'Phone number is invalid');

  const workspaceId = input.workspaceId != null ? Number(input.workspaceId) : null;

  if (workspaceId) {
    const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, businessId } });
    if (!workspace) throw new HttpError(400, 'INVALID_WORKSPACE', 'Invalid workspace');
  }

  const existingEmp = await prisma.user.findFirst({
    where: { businessId, employeeId }
  });
  if (existingEmp) throw new HttpError(409, 'EMPLOYEE_ID_EXISTS', 'Employee ID already exists in this business');

  const created = await prisma.user.create({
    data: {
      fullName: String(input.fullName || '').trim(),
      phone: phoneNormalized,
      email: input.email ? String(input.email).trim() : null,
      employeeId,
      passwordHash,
      role,
      businessId,
      workspaceId: workspaceId || null,
      isActive: active
    }
  });
  return sanitize(created);
}

export async function patchUser(businessId: number, userId: number, input: any) {
  const existing = await prisma.user.findFirst({ where: { id: userId, businessId } });
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'User not found');

  const data: any = {};
  if (input.fullName != null) data.fullName = String(input.fullName).trim();
  if (input.isActive != null) {
    const nextActive = Boolean(input.isActive);
    if (nextActive && !existing.isActive) {
      const sub = await prisma.subscription.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'desc' }
      });
      const endsAt = sub?.endsAt ? new Date(sub.endsAt).getTime() : 0;
      const now = Date.now();
      const subStatus = String(sub?.status || '').toUpperCase();
      const expired = !endsAt || now > endsAt || subStatus === 'PENDING' || subStatus === 'CANCELLED' || subStatus === 'EXPIRED';
      if (expired) throw new HttpError(403, 'SUBSCRIPTION_EXPIRED', 'Subscription expired. Renew plan to activate staff');

      const limit = Number(sub?.userLimit ?? 0);
      if (!limit) throw new HttpError(403, 'SUBSCRIPTION_REQUIRED', 'Active subscription is required to activate staff');

      const currentCount = await prisma.user.count({ where: { businessId, isActive: true } });
      if (currentCount >= limit) {
        throw new HttpError(403, 'USER_LIMIT_REACHED', `User limit reached (${limit}). Upgrade or renew your plan`, {
          maxUsers: limit,
          currentUsers: currentCount
        });
      }
    }
    data.isActive = nextActive;
  }
  if (input.workspaceId !== undefined) {
    const workspaceId = input.workspaceId === null ? null : Number(input.workspaceId);
    if (workspaceId) {
      const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, businessId } });
      if (!workspace) throw new HttpError(400, 'INVALID_WORKSPACE', 'Invalid workspace');
    }
    data.workspaceId = workspaceId;
  }
  if (input.role != null) {
    const role = roles.toUserRole(String(input.role));
    if (role === UserRole.ADMIN) throw new HttpError(400, 'INVALID_ROLE', 'Cannot promote to admin via this endpoint');
    data.role = role;
  }
  if (input.employeeId !== undefined) {
    const nextEmp = input.employeeId ? String(input.employeeId).trim() : null;
    data.employeeId = nextEmp;
  }
  if (input.phone !== undefined) {
    const phone = input.phone ? normalizeTzPhone(String(input.phone)) : null;
    if (input.phone && !phone) throw new HttpError(400, 'INVALID_PHONE', 'Phone number is invalid');
    data.phone = phone;
  }
  if (input.email !== undefined) {
    data.email = input.email ? String(input.email).trim() : null;
  }
  if (input.password != null) {
    data.passwordHash = await hashPassword(String(input.password));
  }

  const updated = await prisma.user.update({ where: { id: existing.id }, data });
  return sanitize(updated);
}

function sanitize(u: any) {
  return {
    id: u.id,
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    employeeId: u.employeeId,
    role: String(u.role || '').toLowerCase(),
    businessId: u.businessId,
    workspaceId: u.workspaceId ?? null,
    isActive: u.isActive,
    createdAt: u.createdAt ? toIso(new Date(u.createdAt)) : null,
    updatedAt: u.updatedAt ? toIso(new Date(u.updatedAt)) : null
  };
}
