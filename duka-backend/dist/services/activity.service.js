"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActivity = createActivity;
exports.listActivity = listActivity;
const prisma_1 = require("../config/prisma");
const toIso = (d) => d.toISOString();
async function createActivity(businessId, userId, input) {
    const created = await prisma_1.prisma.activityLog.create({
        data: {
            businessId,
            userId,
            action: String(input.action || '').trim(),
            entityType: String(input.entityType || '').trim(),
            entityId: input.entityId ? String(input.entityId).trim() : null,
            title: String(input.title || '').trim(),
            detailsJson: input.details !== undefined ? input.details : null
        },
        include: {
            user: { select: { id: true, fullName: true, role: true, employeeId: true, phone: true } }
        }
    });
    return {
        id: created.id,
        action: created.action,
        entityType: created.entityType,
        entityId: created.entityId,
        title: created.title,
        details: created.detailsJson,
        createdAt: toIso(created.createdAt),
        actor: {
            id: created.user.id,
            fullName: created.user.fullName,
            role: String(created.user.role || '').toLowerCase(),
            employeeId: created.user.employeeId,
            phone: created.user.phone
        }
    };
}
async function listActivity(businessId, take = 200) {
    const size = Math.max(1, Math.min(500, Number(take) || 200));
    const rows = await prisma_1.prisma.activityLog.findMany({
        where: { businessId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: size,
        include: {
            user: { select: { id: true, fullName: true, role: true, employeeId: true, phone: true } }
        }
    });
    return rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        title: r.title,
        details: r.detailsJson,
        createdAt: toIso(r.createdAt),
        actor: {
            id: r.user.id,
            fullName: r.user.fullName,
            role: String(r.user.role || '').toLowerCase(),
            employeeId: r.user.employeeId,
            phone: r.user.phone
        }
    }));
}
