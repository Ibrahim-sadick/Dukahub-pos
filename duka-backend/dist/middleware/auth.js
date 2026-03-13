"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireActiveSubscription = requireActiveSubscription;
const prisma_1 = require("../config/prisma");
const jwt_1 = require("../config/jwt");
const apiResponse_1 = require("../utils/apiResponse");
function requireAuth(req, res, next) {
    const header = String(req.headers.authorization || '');
    const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
    if (!token) {
        res.status(401).json((0, apiResponse_1.fail)('UNAUTHORIZED', 'Missing access token'));
        return;
    }
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.auth = {
            userId: parseInt(payload.sub, 10),
            businessId: payload.businessId,
            workspaceId: payload.workspaceId ?? null,
            role: String(payload.role || '')
        };
        next();
    }
    catch {
        res.status(401).json((0, apiResponse_1.fail)('UNAUTHORIZED', 'Invalid or expired access token'));
    }
}
function requireRole(roles) {
    const allow = new Set((roles || []).map((r) => String(r || '').toUpperCase()));
    return (req, res, next) => {
        const role = String(req.auth?.role || '').toUpperCase();
        if (!role || !allow.has(role)) {
            res.status(403).json((0, apiResponse_1.fail)('FORBIDDEN', 'Insufficient permissions'));
            return;
        }
        next();
    };
}
function requireActiveSubscription(req, res, next) {
    const businessId = req.auth?.businessId;
    if (!businessId) {
        res.status(401).json((0, apiResponse_1.fail)('UNAUTHORIZED', 'Not authenticated'));
        return;
    }
    prisma_1.prisma.subscription
        .findFirst({
        where: { businessId },
        orderBy: { createdAt: 'desc' }
    })
        .then((sub) => {
        const now = Date.now();
        const endsAt = sub?.endsAt ? new Date(sub.endsAt).getTime() : 0;
        const trialEndsAt = sub?.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : 0;
        const rawStatus = String(sub?.status || '').toUpperCase();
        const effectiveStatus = (() => {
            if (!sub)
                return 'EXPIRED';
            if (rawStatus === 'CANCELLED')
                return 'CANCELLED';
            if (endsAt && now > endsAt)
                return 'EXPIRED';
            return rawStatus || 'PAID';
        })();
        const locked = effectiveStatus === 'EXPIRED' || effectiveStatus === 'PENDING' || effectiveStatus === 'CANCELLED';
        req.auth = { ...req.auth, subscriptionLocked: locked };
        if (!locked) {
            next();
            return;
        }
        const message = effectiveStatus === 'EXPIRED'
            ? 'Subscription expired. Please renew your plan.'
            : effectiveStatus === 'PENDING'
                ? 'Subscription payment is pending.'
                : 'Subscription is inactive.';
        res.status(403).json((0, apiResponse_1.fail)('SUBSCRIPTION_EXPIRED', message, {
            status: String(effectiveStatus).toLowerCase(),
            endsAt: endsAt ? new Date(endsAt).toISOString() : null,
            trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null
        }));
    })
        .catch(() => {
        res.status(500).json((0, apiResponse_1.fail)('SERVER_ERROR', 'Failed to verify subscription'));
    });
}
