"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roles = void 0;
exports.signup = signup;
exports.loginAdmin = loginAdmin;
exports.loginStaff = loginStaff;
exports.logout = logout;
exports.getMe = getMe;
exports.requestPasswordReset = requestPasswordReset;
exports.confirmPasswordReset = confirmPasswordReset;
const prisma_1 = require("../config/prisma");
const phone_1 = require("../utils/phone");
const httpError_1 = require("../utils/httpError");
const password_1 = require("../utils/password");
const jwt_1 = require("../config/jwt");
const UserRole = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    CASHIER: 'CASHIER',
    ATTENDANT: 'ATTENDANT',
    STAFF: 'STAFF'
};
const SubscriptionStatus = {
    PAID: 'PAID',
    TRIAL: 'TRIAL',
    PENDING: 'PENDING',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED'
};
const toUserRole = (role) => {
    const r = String(role || '').trim().toUpperCase();
    if (r === 'ADMIN')
        return UserRole.ADMIN;
    if (r === 'MANAGER')
        return UserRole.MANAGER;
    if (r === 'CASHIER')
        return UserRole.CASHIER;
    if (r === 'ATTENDANT')
        return UserRole.ATTENDANT;
    return UserRole.STAFF;
};
const toSubStatus = (status) => {
    const s = String(status || '').trim().toLowerCase();
    if (s === 'paid')
        return SubscriptionStatus.PAID;
    if (s === 'trial')
        return SubscriptionStatus.TRIAL;
    if (s === 'expired')
        return SubscriptionStatus.EXPIRED;
    if (s === 'cancelled')
        return SubscriptionStatus.CANCELLED;
    return SubscriptionStatus.PENDING;
};
const toIso = (d) => d.toISOString();
async function signup(input) {
    const normalizedPhone = (0, phone_1.normalizeTzPhone)(input.ownerPhone);
    if (!normalizedPhone)
        throw new httpError_1.HttpError(400, 'INVALID_PHONE', 'Phone number is invalid');
    const existingPhone = await prisma_1.prisma.user.findFirst({
        where: { phone: normalizedPhone }
    });
    if (existingPhone)
        throw new httpError_1.HttpError(409, 'PHONE_EXISTS', 'Phone number already exists');
    const plan = await prisma_1.prisma.plan.findFirst({ where: { name: input.planName, isActive: true } });
    if (!plan)
        throw new httpError_1.HttpError(400, 'INVALID_PLAN', 'Invalid plan');
    const module = await prisma_1.prisma.module.findFirst({ where: { key: input.moduleKey, isActive: true } });
    if (!module)
        throw new httpError_1.HttpError(400, 'INVALID_MODULE', 'Invalid module');
    const passwordHash = await (0, password_1.hashPassword)(input.password);
    const now = Date.now();
    const months = 1;
    const discountPercent = 0;
    const durationDays = Number(plan.durationDays ?? 30);
    const startedAt = new Date(now);
    const trialEndsAt = input.subscription?.trialEndsAt ? new Date(input.subscription.trialEndsAt) : null;
    const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const status = toSubStatus(input.subscription?.status ?? 'paid');
    const amountPaid = input.subscription?.amountPaid != null ? Number(input.subscription.amountPaid) : null;
    const paymentReference = input.subscription?.paymentReference ? String(input.subscription.paymentReference).trim() : '';
    const paymentPhone = input.subscription?.paymentPhone ? (0, phone_1.normalizeTzPhone)(input.subscription.paymentPhone) : null;
    if (status === SubscriptionStatus.PAID) {
        const expected = Number(plan.price);
        const got = Number(amountPaid ?? expected);
        if (got !== expected)
            throw new httpError_1.HttpError(400, 'INVALID_AMOUNT', `Amount must be ${expected} for plan ${plan.name}`);
    }
    const { business, user, workspace, subscription } = await prisma_1.prisma.$transaction(async (tx) => {
        if (paymentReference) {
            const existingRef = await tx.payment.findFirst({ where: { reference: paymentReference } });
            if (existingRef)
                throw new httpError_1.HttpError(409, 'REFERENCE_EXISTS', 'Payment reference already exists');
        }
        const business = await tx.business.create({
            data: {
                businessName: input.businessName,
                ownerUserId: null,
                phone: normalizedPhone,
                email: input.ownerEmail || null,
                address: input.address || null,
                currency: input.currency || 'TZS',
                timezone: input.timezone || 'Africa/Dar_es_Salaam'
            }
        });
        const workspace = await tx.workspace.create({
            data: {
                businessId: business.id,
                name: 'Main',
                location: input.address || null,
                isMain: true
            }
        });
        const user = await tx.user.create({
            data: {
                fullName: input.ownerFullName,
                phone: normalizedPhone,
                email: input.ownerEmail || null,
                passwordHash,
                role: UserRole.ADMIN,
                businessId: business.id,
                workspaceId: workspace.id
            }
        });
        await tx.business.update({
            where: { id: business.id },
            data: { ownerUserId: user.id }
        });
        await tx.businessModule.create({
            data: { businessId: business.id, moduleId: module.id, enabled: true }
        });
        const subscription = await tx.subscription.create({
            data: {
                businessId: business.id,
                planId: plan.id,
                status,
                startedAt,
                endsAt,
                trialEndsAt,
                months,
                durationDays,
                discountPercent,
                userLimit: plan.userLimit,
                amountPaid: amountPaid != null ? amountPaid : null,
                paymentProvider: input.subscription?.paymentProvider || null,
                paymentPhone
            }
        });
        if (paymentReference || amountPaid != null) {
            await tx.payment.create({
                data: {
                    businessId: business.id,
                    subscriptionId: subscription.id,
                    reference: paymentReference || null,
                    phoneNumber: paymentPhone,
                    amount: Number(amountPaid ?? 0),
                    provider: input.subscription?.paymentProvider || null,
                    status: String(status).toLowerCase(),
                    paidAt: startedAt
                }
            });
        }
        return { business, workspace, subscription, user };
    });
    const tokens = await issueTokens({
        userId: user.id,
        businessId: business.id,
        workspaceId: workspace.id,
        role: user.role
    });
    return {
        user: sanitizeUser({ ...user, businessId: business.id, workspaceId: workspace.id, role: user.role }),
        business: { id: business.id, businessName: business.businessName, currency: business.currency, timezone: business.timezone },
        workspace: { id: workspace.id, name: workspace.name, isMain: workspace.isMain },
        subscription: {
            id: subscription.id,
            status: subscription.status,
            startedAt: toIso(subscription.startedAt),
            endsAt: toIso(subscription.endsAt),
            trialEndsAt: subscription.trialEndsAt ? toIso(subscription.trialEndsAt) : null,
            userLimit: subscription.userLimit,
            paymentProvider: subscription.paymentProvider,
            paymentPhone: subscription.paymentPhone,
            plan: { id: plan.id, name: plan.name, pricePerMonth: plan.pricePerMonth, months: plan.months }
        },
        tokens
    };
}
async function loginAdmin(input) {
    const normalizedPhone = (0, phone_1.normalizeTzPhone)(input.phone);
    if (!normalizedPhone)
        throw new httpError_1.HttpError(400, 'INVALID_PHONE', 'Phone number is invalid');
    const user = await prisma_1.prisma.user.findFirst({
        where: { role: UserRole.ADMIN, phone: normalizedPhone, isActive: true }
    });
    if (!user)
        throw new httpError_1.HttpError(401, 'INVALID_CREDENTIALS', 'Invalid phone or password');
    const ok = await (0, password_1.verifyPassword)(input.password, user.passwordHash);
    if (!ok)
        throw new httpError_1.HttpError(401, 'INVALID_CREDENTIALS', 'Invalid phone or password');
    const workspaceId = user.workspaceId ?? null;
    const tokens = await issueTokens({
        userId: user.id,
        businessId: user.businessId,
        workspaceId,
        role: user.role,
        rememberMe: Boolean(input.rememberMe)
    });
    return { user: sanitizeUser(user), tokens };
}
async function loginStaff(input) {
    const employeeId = String(input.employeeId || '').trim();
    if (!employeeId)
        throw new httpError_1.HttpError(400, 'INVALID_EMPLOYEE_ID', 'Employee ID is required');
    const matches = await prisma_1.prisma.user.findMany({
        where: {
            role: { not: UserRole.ADMIN },
            employeeId,
            isActive: true,
            ...(input.businessId ? { businessId: input.businessId } : {})
        },
        include: {
            business: { select: { id: true, businessName: true } },
            workspace: { select: { id: true, name: true } }
        }
    });
    if (!matches.length)
        throw new httpError_1.HttpError(401, 'INVALID_CREDENTIALS', 'Invalid employee ID or password');
    const verified = [];
    for (const u of matches) {
        const ok = await (0, password_1.verifyPassword)(input.password, u.passwordHash);
        if (ok)
            verified.push(u);
    }
    if (!verified.length)
        throw new httpError_1.HttpError(401, 'INVALID_CREDENTIALS', 'Invalid employee ID or password');
    if (verified.length > 1 && !input.businessId) {
        return {
            selectionRequired: true,
            options: verified.map((u) => ({
                userId: u.id,
                businessId: u.businessId,
                businessName: u.business.businessName,
                workspaceId: u.workspaceId ?? null,
                workspaceName: u.workspace?.name ?? null,
                role: u.role
            }))
        };
    }
    const chosen = verified[0];
    const tokens = await issueTokens({
        userId: chosen.id,
        businessId: chosen.businessId,
        workspaceId: chosen.workspaceId ?? null,
        role: chosen.role,
        rememberMe: Boolean(input.rememberMe)
    });
    return { selectionRequired: false, user: sanitizeUser(chosen), tokens };
}
async function logout(refreshToken) {
    const tokenHash = (0, jwt_1.hashToken)(refreshToken);
    await prisma_1.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() }
    });
}
async function getMe(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        include: {
            business: true,
            workspace: true
        }
    });
    if (!user || !user.isActive)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const subscription = await prisma_1.prisma.subscription.findFirst({
        where: { businessId: user.businessId },
        orderBy: { createdAt: 'desc' },
        include: { plan: true }
    });
    const modules = await prisma_1.prisma.businessModule.findMany({
        where: { businessId: user.businessId, enabled: true },
        include: { module: true }
    });
    const subSummary = subscription ? summarizeSubscription(subscription) : null;
    return {
        user: sanitizeUser(user),
        business: {
            id: user.business.id,
            businessName: user.business.businessName,
            phone: user.business.phone,
            email: user.business.email,
            address: user.business.address,
            currency: user.business.currency,
            timezone: user.business.timezone
        },
        workspace: user.workspace
            ? { id: user.workspace.id, name: user.workspace.name, location: user.workspace.location, isMain: user.workspace.isMain }
            : null,
        modules: modules.map((m) => ({ key: m.module.key, name: m.module.name, enabled: m.enabled })),
        subscription: subSummary,
        access: {
            locked: Boolean(subSummary?.locked),
            reason: subSummary?.lockReason || ''
        }
    };
}
async function requestPasswordReset(input) {
    const phone = (0, phone_1.normalizeTzPhone)(String(input?.phone || '').trim());
    if (!phone)
        throw new httpError_1.HttpError(400, 'INVALID_PHONE', 'Phone number is invalid');
    const user = await prisma_1.prisma.user.findFirst({ where: { phone, isActive: true } });
    if (!user)
        throw new httpError_1.HttpError(404, 'PHONE_NOT_FOUND', 'Phone number not found');
    const otp = String(input?.otp || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (otp.length !== 6)
        throw new httpError_1.HttpError(400, 'INVALID_OTP', 'OTP code is invalid');
    const codeHash = await (0, password_1.hashPassword)(otp);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    await prisma_1.prisma.otp.create({
        data: {
            phone,
            codeHash,
            purpose: 'password_reset',
            status: 'sent',
            attemptCount: 0,
            expiresAt
        }
    });
    return {
        phone,
        expiresAt: expiresAt.toISOString()
    };
}
async function confirmPasswordReset(input) {
    const phone = (0, phone_1.normalizeTzPhone)(String(input?.phone || '').trim());
    if (!phone)
        throw new httpError_1.HttpError(400, 'INVALID_PHONE', 'Phone number is invalid');
    const otp = String(input?.otp || '').replace(/[^0-9]/g, '').slice(0, 6);
    if (otp.length !== 6)
        throw new httpError_1.HttpError(400, 'INVALID_OTP', 'OTP code is invalid');
    const newPassword = String(input?.newPassword || '');
    if (newPassword.length < 8)
        throw new httpError_1.HttpError(400, 'INVALID_PASSWORD', 'Password must be at least 8 characters');
    const user = await prisma_1.prisma.user.findFirst({ where: { phone, isActive: true } });
    if (!user)
        throw new httpError_1.HttpError(404, 'PHONE_NOT_FOUND', 'Phone number not found');
    const record = await prisma_1.prisma.otp.findFirst({
        where: {
            phone,
            purpose: 'password_reset',
            status: 'sent',
            expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
    });
    if (!record || !record.codeHash)
        throw new httpError_1.HttpError(400, 'OTP_EXPIRED', 'OTP expired. Request a new one');
    const ok = await (0, password_1.verifyPassword)(otp, record.codeHash);
    if (!ok) {
        await prisma_1.prisma.otp.update({ where: { id: record.id }, data: { attemptCount: record.attemptCount + 1 } });
        throw new httpError_1.HttpError(400, 'INVALID_OTP', 'Invalid code. Try again');
    }
    const passwordHash = await (0, password_1.hashPassword)(newPassword);
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
        await tx.otp.update({ where: { id: record.id }, data: { status: 'used', verifiedAt: new Date() } });
    });
    return { ok: true };
}
async function issueTokens(opts) {
    const accessToken = (0, jwt_1.signAccessToken)({
        sub: String(opts.userId),
        businessId: opts.businessId,
        workspaceId: opts.workspaceId ?? null,
        role: String(opts.role)
    });
    const jti = (0, jwt_1.randomId)();
    const refreshToken = (0, jwt_1.signRefreshToken)({ sub: String(opts.userId), jti }, opts.rememberMe ? undefined : 7);
    const tokenHash = (0, jwt_1.hashToken)(refreshToken);
    const expiresAt = new Date(Date.now() + (opts.rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
    await prisma_1.prisma.refreshToken.create({
        data: {
            userId: opts.userId,
            tokenHash,
            expiresAt
        }
    });
    return { accessToken, refreshToken, expiresAt: toIso(expiresAt) };
}
function sanitizeUser(user) {
    return {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        employeeId: user.employeeId,
        role: String(user.role || '').toLowerCase(),
        businessId: user.businessId,
        workspaceId: user.workspaceId ?? null,
        isActive: user.isActive,
        createdAt: user.createdAt ? toIso(new Date(user.createdAt)) : null,
        updatedAt: user.updatedAt ? toIso(new Date(user.updatedAt)) : null
    };
}
function summarizeSubscription(subscription) {
    const now = Date.now();
    const endsAtMs = new Date(subscription.endsAt).getTime();
    const trialEndsAtMs = subscription.trialEndsAt ? new Date(subscription.trialEndsAt).getTime() : 0;
    const rawStatus = String(subscription.status || '').toUpperCase();
    const effectiveStatus = (() => {
        if (rawStatus === SubscriptionStatus.CANCELLED)
            return SubscriptionStatus.CANCELLED;
        if (endsAtMs && now > endsAtMs)
            return SubscriptionStatus.EXPIRED;
        return rawStatus;
    })();
    const locked = effectiveStatus === SubscriptionStatus.EXPIRED || effectiveStatus === SubscriptionStatus.PENDING || effectiveStatus === SubscriptionStatus.CANCELLED;
    const lockReason = (() => {
        if (!locked)
            return '';
        if (effectiveStatus === SubscriptionStatus.EXPIRED)
            return 'expired';
        if (effectiveStatus === SubscriptionStatus.PENDING)
            return 'payment_pending';
        if (effectiveStatus === SubscriptionStatus.CANCELLED)
            return 'cancelled';
        return 'inactive';
    })();
    return {
        id: subscription.id,
        status: String(effectiveStatus).toLowerCase(),
        startedAt: toIso(new Date(subscription.startedAt)),
        endsAt: toIso(new Date(subscription.endsAt)),
        trialEndsAt: trialEndsAtMs ? toIso(new Date(subscription.trialEndsAt)) : null,
        months: subscription.months,
        durationDays: subscription.durationDays ?? 30,
        discountPercent: subscription.discountPercent,
        userLimit: subscription.userLimit,
        maxUsers: subscription.userLimit,
        amountPaid: subscription.amountPaid,
        paymentPhone: subscription.paymentPhone,
        paymentProvider: subscription.paymentProvider,
        plan: subscription.plan
            ? { id: subscription.plan.id, name: subscription.plan.name, pricePerMonth: subscription.plan.pricePerMonth, price: subscription.plan.price, durationDays: subscription.plan.durationDays ?? 30 }
            : null,
        locked,
        lockReason
    };
}
exports.roles = { toUserRole };
