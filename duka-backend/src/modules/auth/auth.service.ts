import { Prisma } from '@prisma/client';
import { defaultBusinessSettings } from '../../constants/defaults';
import { defaultStaffPermissionKeys, permissionCatalog } from '../../constants/permissions';
import { prisma } from '../../lib/prisma';
import { recordActivity } from '../../shared/activity-log';
import { hashPassword, signAccessToken, signRefreshToken, verifyPassword, verifyRefreshToken } from '../../shared/auth';
import { ApiError } from '../../shared/errors';
import { normalizeTzPhone255 } from '../../shared/utils';

const includeUserRelations = {
  role: { include: { permissions: { include: { permission: true } } } },
  business: true
} as const;

type NumericLike = number | { toString(): string };

type UserWithRole = {
  id: string;
  businessId: string;
  employeeId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  roleLabel: string | null;
  isOwner: boolean;
  profilePhoto: string | null;
  role: {
    name: string;
    permissions: Array<{
      permission: {
        id: string;
        key: string;
      };
    }>;
  } | null;
  business: {
    id: string;
    name: string;
    businessName: string | null;
    businessModule: string | null;
    subscriptionPlan: string | null;
    subscriptionPaymentStatus: string | null;
    subscriptionStartedAt: Date | null;
    subscriptionEndsAt: Date | null;
    subscriptionTrialEndsAt: Date | null;
    subscriptionBillingCycle: string | null;
    paymentProvider: string | null;
    paymentPhone: string | null;
    paymentReference: string | null;
    subscriptionDurationDays: NumericLike | null;
    subscriptionMonths: NumericLike | null;
    subscriptionDiscountPercent: NumericLike | null;
    subscriptionRawMonthlyPrice: NumericLike | null;
    subscriptionAmountPaid: NumericLike | null;
  };
};

const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const cleanText = (value: unknown) => String(value ?? '').trim();
const cleanNullableText = (value: unknown) => {
  const normalized = cleanText(value);
  return normalized || null;
};
type PasswordResetChallengeRecord = {
  id: string;
  userId: string;
  businessId: string;
  phone: string;
  otpHash: string;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
};

type PasswordResetChallengeUser = {
  id: string;
  businessId: string;
  fullName: string;
  phone: string | null;
  isOwner: boolean;
  status: string;
};

type PasswordResetChallengeWithUser = PasswordResetChallengeRecord & {
  user: PasswordResetChallengeUser | null;
};

type PasswordResetChallengeStore = {
  updateMany(args: { where: unknown; data: unknown }): Promise<unknown>;
  create(args: { data: unknown }): Promise<PasswordResetChallengeRecord>;
  findFirst(args: { where: unknown; include: unknown }): Promise<PasswordResetChallengeWithUser | null>;
  update(args: { where: unknown; data: unknown }): Promise<PasswordResetChallengeRecord>;
};

const passwordResetChallengeStore = (prisma as unknown as { passwordResetChallenge: PasswordResetChallengeStore }).passwordResetChallenge;

const upsertPermissionCatalog = async () => {
  for (const permission of permissionCatalog) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: permission,
      create: permission
    });
  }
};

const resolvePermissions = (user: UserWithRole) => {
  if (!user.role?.permissions?.length) return [];
  return user.role.permissions.map((entry: { permission: { key: string } }) => entry.permission.key);
};

const buildCurrentUserPayload = (user: UserWithRole, permissions: string[]) => {
  const business = user.business;
  const roleName = String(user.role?.name || user.roleLabel || (user.isOwner ? 'admin' : 'staff')).trim();
  const normalizedPhone = normalizeTzPhone255(user.phone || '');
  const isOwner = user.isOwner || roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'owner';

  return {
    id: isOwner ? normalizedPhone || user.id : user.employeeId || user.id,
    userId: user.id,
    role: isOwner ? 'admin' : roleName.toLowerCase(),
    name: user.fullName,
    phone: normalizedPhone || user.phone || '',
    fullName: user.fullName,
    email: user.email || '',
    businessId: business.id,
    businessName: business.businessName || business.name,
    businessModule: business.businessModule,
    subscriptionPlan: business.subscriptionPlan || '',
    subscriptionPaymentStatus: business.subscriptionPaymentStatus || '',
    subscriptionStartedAt: business.subscriptionStartedAt?.toISOString() || '',
    subscriptionEndsAt: business.subscriptionEndsAt?.toISOString() || '',
    subscriptionTrialEndsAt: business.subscriptionTrialEndsAt?.toISOString() || '',
    subscriptionBillingCycle: business.subscriptionBillingCycle || '',
    paymentProvider: business.paymentProvider || '',
    paymentPhone: business.paymentPhone || '',
    paymentReference: business.paymentReference || '',
    profilePhoto: user.profilePhoto || '',
    subscriptionDurationDays: Number(business.subscriptionDurationDays || 0),
    subscriptionMonths: Number(business.subscriptionMonths || 0),
    subscriptionDiscountPercent: Number(business.subscriptionDiscountPercent || 0),
    subscriptionRawMonthlyPrice: Number(business.subscriptionRawMonthlyPrice || 0),
    subscriptionAmountPaid: Number(business.subscriptionAmountPaid || 0),
    employeeId: user.employeeId || '',
    staffEmployeeId: user.employeeId || '',
    permissions
  };
};

const buildAuthResponse = async (user: UserWithRole) => {
  const permissions = resolvePermissions(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const sessionSeed = await prisma.session.create({
    data: {
      businessId: user.businessId,
      userId: user.id,
      refreshTokenHash: 'pending',
      expiresAt
    }
  });

  const tokenPayload = {
    userId: user.id,
    businessId: user.businessId,
    role: user.isOwner ? 'admin' : String(user.role?.name || user.roleLabel || 'staff').toLowerCase(),
    permissions,
    sessionId: sessionSeed.id
  };

  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  const refreshTokenHash = await hashPassword(refreshToken);

  await prisma.session.update({
    where: { id: sessionSeed.id },
    data: { refreshTokenHash }
  });

  return {
    accessToken,
    refreshToken,
    session: {
      id: sessionSeed.id,
      expiresAt: expiresAt.toISOString()
    },
    currentUser: buildCurrentUserPayload(user, permissions)
  };
};

export const registerOwner = async (input: {
  fullName: string;
  email?: string;
  phone: string;
  password: string;
  businessName: string;
  businessModule: string;
  subscriptionPlan?: string;
  subscriptionPaymentStatus?: string;
  subscriptionStartedAt?: string;
  subscriptionEndsAt?: string;
  subscriptionTrialEndsAt?: string;
  subscriptionBillingCycle?: string;
  subscriptionDurationDays?: number;
  subscriptionMonths?: number;
  subscriptionDiscountPercent?: number;
  subscriptionRawMonthlyPrice?: number;
  subscriptionAmountPaid?: number;
  paymentProvider?: string;
  paymentPhone?: string;
  paymentReference?: string;
}) => {
  const phone = normalizeTzPhone255(input.phone);
  if (!phone) throw new ApiError(400, 'Phone number is invalid', 'PHONE_INVALID');
  const fullName = cleanText(input.fullName);
  const businessName = cleanText(input.businessName);
  const email = cleanNullableText(input.email);
  const businessModule = cleanText(input.businessModule) || 'retail_supermarket';
  const paymentProvider = cleanNullableText(input.paymentProvider);
  const paymentPhone = cleanNullableText(input.paymentPhone);
  const paymentReference = cleanNullableText(input.paymentReference);

  if (!fullName) throw new ApiError(400, 'Full name is required', 'FULL_NAME_REQUIRED');
  if (!businessName) throw new ApiError(400, 'Business name is required', 'BUSINESS_NAME_REQUIRED');

  const existing = await prisma.user.findFirst({ where: { phone } });
  if (existing) throw new ApiError(409, 'Phone number already exists. Please login instead.', 'PHONE_EXISTS');

  await upsertPermissionCatalog();
  const ownerPasswordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingInTransaction = await tx.user.findFirst({ where: { phone } });
    if (existingInTransaction) {
      throw new ApiError(409, 'Phone number already exists. Please login instead.', 'PHONE_EXISTS');
    }

    const business = await tx.business.create({
      data: {
        name: businessName,
        businessName: businessName,
        phone,
        email,
        businessModule,
        subscriptionPlan: input.subscriptionPlan || null,
        subscriptionPaymentStatus: input.subscriptionPaymentStatus || null,
        subscriptionStartedAt: input.subscriptionStartedAt ? new Date(input.subscriptionStartedAt) : null,
        subscriptionEndsAt: input.subscriptionEndsAt ? new Date(input.subscriptionEndsAt) : null,
        subscriptionTrialEndsAt: input.subscriptionTrialEndsAt ? new Date(input.subscriptionTrialEndsAt) : null,
        subscriptionBillingCycle: input.subscriptionBillingCycle || null,
        subscriptionDurationDays: input.subscriptionDurationDays || 0,
        subscriptionMonths: input.subscriptionMonths || 0,
        subscriptionDiscountPercent: input.subscriptionDiscountPercent || 0,
        subscriptionRawMonthlyPrice: input.subscriptionRawMonthlyPrice || 0,
        subscriptionAmountPaid: input.subscriptionAmountPaid || 0,
        paymentProvider,
        paymentPhone,
        paymentReference
      }
    });

    const permissions = await tx.permission.findMany({
        where: { key: { in: permissionCatalog.map((permission: { key: string }) => permission.key) } }
    });

    const adminRole = await tx.role.create({
      data: {
        businessId: business.id,
        name: 'Admin',
        code: 'admin',
        description: 'Owner and admin access',
        isSystem: true,
        permissions: {
          create: permissions.map((permission: { id: string }) => ({ permissionId: permission.id }))
        }
      }
    });

    const staffPermissions = permissions.filter((permission: { key: string }) =>
      defaultStaffPermissionKeys.includes(permission.key as (typeof defaultStaffPermissionKeys)[number])
    );

    await tx.role.create({
      data: {
        businessId: business.id,
        name: 'Staff',
        code: 'staff',
        description: 'Standard staff access',
        isSystem: true,
        permissions: {
          create: staffPermissions.map((permission: { id: string }) => ({ permissionId: permission.id }))
        }
      }
    });

    const owner = await tx.user.create({
      data: {
        businessId: business.id,
        roleId: adminRole.id,
        fullName,
        email,
        phone,
        passwordHash: ownerPasswordHash,
        roleLabel: 'admin',
        isOwner: true
      },
      include: includeUserRelations
    });

    await tx.business.update({
      where: { id: business.id },
      data: { ownerId: owner.id }
    });

    await tx.businessSetting.create({
      data: {
        businessId: business.id,
        general: defaultBusinessSettings.general,
        sales: defaultBusinessSettings.sales,
        inventory: defaultBusinessSettings.inventory,
        notifications: defaultBusinessSettings.notifications,
        localization: defaultBusinessSettings.localization,
        appearance: defaultBusinessSettings.appearance,
        security: defaultBusinessSettings.security,
        profile: defaultBusinessSettings.profile
      }
    });

    await tx.documentCounter.createMany({
      data: [
        { businessId: business.id, key: 'sale', prefix: 'SO', nextValue: 1150, padding: 4 },
        { businessId: business.id, key: 'invoice', prefix: 'INV', nextValue: 1, padding: 5 },
        { businessId: business.id, key: 'purchase', prefix: 'PO', nextValue: 1, padding: 5 }
      ]
    });

    if (input.subscriptionPlan) {
      await tx.subscriptionRecord.create({
        data: {
          businessId: business.id,
          createdById: owner.id,
          planCode: input.subscriptionPlan,
          billingCycle: input.subscriptionBillingCycle || '1m',
          amountPaid: input.subscriptionAmountPaid || 0,
          rawMonthlyPrice: input.subscriptionRawMonthlyPrice || 0,
          discountPercent: input.subscriptionDiscountPercent || 0,
          paymentStatus: input.subscriptionPaymentStatus || 'trial',
          paymentProvider,
          paymentPhone,
          paymentReference,
          startedAt: input.subscriptionStartedAt ? new Date(input.subscriptionStartedAt) : new Date(),
          endsAt: input.subscriptionEndsAt ? new Date(input.subscriptionEndsAt) : null,
          trialEndsAt: input.subscriptionTrialEndsAt ? new Date(input.subscriptionTrialEndsAt) : null,
          durationDays: input.subscriptionDurationDays || 0,
          months: input.subscriptionMonths || 0
        }
      });
    }

    return owner;
  });

  await recordActivity({
    businessId: result.businessId,
    userId: result.id,
    action: 'owner_register',
    title: 'Owner account created',
    details: `${result.fullName} created ${result.business.businessName || result.business.name}`,
    entityType: 'Business',
    entityId: result.businessId
  });

  return buildAuthResponse(result);
};

export const checkOwnerPhoneAvailability = async (phoneInput: string) => {
  const phone = normalizeTzPhone255(phoneInput);
  if (!phone) throw new ApiError(400, 'Phone number is invalid', 'PHONE_INVALID');

  const existing = await prisma.user.findFirst({
    where: { phone },
    select: { id: true }
  });

  return {
    phone,
    available: !existing,
    exists: Boolean(existing),
    message: existing ? 'Phone number already exists. Please login instead.' : 'Phone number is available'
  };
};

export const loginOwner = async (phoneInput: string, password: string) => {
  const phone = normalizeTzPhone255(phoneInput);
  if (!phone) throw new ApiError(400, 'Phone number is invalid', 'PHONE_INVALID');

  const user = await prisma.user.findFirst({
    where: { phone, isOwner: true, status: 'ACTIVE' },
    include: includeUserRelations
  });

  if (!user) throw new ApiError(404, 'No account found for this phone. Please sign up.', 'ACCOUNT_NOT_FOUND');
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid phone number or password', 'INVALID_CREDENTIALS');
  if (!user.business.subscriptionPlan) {
    throw new ApiError(403, 'Please finish choosing your plan before logging in.', 'PLAN_REQUIRED');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordActivity({
    businessId: user.businessId,
    userId: user.id,
    action: 'login',
    title: 'Owner logged in',
    details: `${user.fullName} logged in`,
    entityType: 'Auth',
    entityId: user.id
  });

  return buildAuthResponse(user);
};

export const requestOwnerPasswordReset = async (phoneInput: string, otp: string) => {
  const phone = normalizeTzPhone255(phoneInput);
  if (!phone) throw new ApiError(400, 'Phone number is invalid', 'PHONE_INVALID');
  const otpCode = String(otp || '').trim();
  if (!/^\d{6}$/.test(otpCode)) throw new ApiError(400, 'OTP must be a 6-digit code', 'OTP_INVALID');

  const user = await prisma.user.findFirst({
    where: { phone, isOwner: true, status: 'ACTIVE' },
    select: {
      id: true,
      businessId: true,
      fullName: true,
      phone: true
    }
  });

  if (!user) throw new ApiError(404, 'No account found for this phone number', 'ACCOUNT_NOT_FOUND');

  const otpHash = await hashPassword(otpCode);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  const now = new Date();

  await passwordResetChallengeStore.updateMany({
    where: {
      userId: user.id,
      consumedAt: null,
      expiresAt: { gte: now }
    },
    data: { consumedAt: now }
  });

  const challenge = await passwordResetChallengeStore.create({
    data: {
      businessId: user.businessId,
      userId: user.id,
      phone,
      otpHash,
      expiresAt
    }
  });

  return {
    challengeId: challenge.id,
    phone,
    expiresAt: expiresAt.toISOString()
  };
};

export const confirmOwnerPasswordReset = async (input: {
  challengeId: string;
  phone: string;
  otp: string;
  newPassword: string;
}) => {
  const challengeId = String(input.challengeId || '').trim();
  if (!challengeId) throw new ApiError(400, 'Reset challenge is required', 'RESET_CHALLENGE_REQUIRED');

  const phone = normalizeTzPhone255(input.phone);
  if (!phone) throw new ApiError(400, 'Phone number is invalid', 'PHONE_INVALID');
  const otpCode = String(input.otp || '').trim();
  if (!/^\d{6}$/.test(otpCode)) throw new ApiError(400, 'OTP must be a 6-digit code', 'OTP_INVALID');
  if (String(input.newPassword || '').length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters', 'PASSWORD_TOO_SHORT');
  }

  const challenge = await passwordResetChallengeStore.findFirst({
    where: { id: challengeId, phone },
    include: {
      user: {
        select: {
          id: true,
          businessId: true,
          fullName: true,
          phone: true,
          isOwner: true,
          status: true
        }
      }
    }
  });

  if (!challenge) throw new ApiError(400, 'Password reset challenge is invalid', 'RESET_CHALLENGE_INVALID');
  if (!challenge.user || !challenge.user.isOwner || challenge.user.status !== 'ACTIVE') {
    throw new ApiError(400, 'Password reset challenge is invalid', 'RESET_CHALLENGE_INVALID');
  }
  const challengeUser = challenge.user;
  if (challenge.consumedAt) {
    throw new ApiError(400, 'Password reset challenge has already been used', 'RESET_CHALLENGE_CONSUMED');
  }
  if (challenge.expiresAt < new Date()) {
    await passwordResetChallengeStore.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() }
    });
    throw new ApiError(400, 'Password reset challenge has expired', 'RESET_CHALLENGE_EXPIRED');
  }
  if (challenge.attemptCount >= PASSWORD_RESET_MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many invalid OTP attempts. Request a new reset code.', 'RESET_OTP_ATTEMPTS_EXCEEDED');
  }

  const otpValid = await verifyPassword(otpCode, challenge.otpHash);
  if (!otpValid) {
    const nextAttempts = challenge.attemptCount + 1;
    await passwordResetChallengeStore.update({
      where: { id: challenge.id },
      data: {
        attemptCount: nextAttempts,
        consumedAt: nextAttempts >= PASSWORD_RESET_MAX_ATTEMPTS ? new Date() : null
      }
    });
    throw new ApiError(400, 'The OTP code is invalid', 'RESET_OTP_INVALID');
  }

  const passwordHash = await hashPassword(input.newPassword);
  const now = new Date();
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const txPasswordResetChallengeStore = (tx as unknown as { passwordResetChallenge: PasswordResetChallengeStore }).passwordResetChallenge;

    await tx.user.update({
      where: { id: challengeUser.id },
      data: { passwordHash }
    });
    await tx.session.updateMany({
      where: { userId: challengeUser.id, revokedAt: null },
      data: { revokedAt: now }
    });
    await txPasswordResetChallengeStore.update({
      where: { id: challenge.id },
      data: { consumedAt: now, attemptCount: challenge.attemptCount + 1 }
    });
    await txPasswordResetChallengeStore.updateMany({
      where: {
        userId: challengeUser.id,
        consumedAt: null,
        id: { not: challenge.id }
      },
      data: { consumedAt: now }
    });
  });

  await recordActivity({
    businessId: challengeUser.businessId,
    userId: challengeUser.id,
    action: 'password_reset',
    title: 'Owner password reset',
    details: `${challengeUser.fullName} reset the account password`,
    entityType: 'Auth',
    entityId: challengeUser.id
  });

  return { success: true };
};

export const refreshSession = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({ where: { id: payload.sessionId } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new ApiError(401, 'Session expired', 'SESSION_EXPIRED');
  }

  const isValid = await verifyPassword(refreshToken, session.refreshTokenHash);
  if (!isValid) throw new ApiError(401, 'Invalid refresh token', 'TOKEN_INVALID');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: includeUserRelations
  });

  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });

  return buildAuthResponse(user);
};

export const logoutSession = async (sessionId: string, userId: string, businessId: string) => {
  await prisma.session.updateMany({
    where: { id: sessionId, userId },
    data: { revokedAt: new Date() }
  });

  await recordActivity({
    businessId,
    userId,
    action: 'logout',
    title: 'User logged out',
    details: 'Session revoked',
    entityType: 'Auth',
    entityId: sessionId
  });
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: includeUserRelations
  });

  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  return buildCurrentUserPayload(user, resolvePermissions(user));
};
