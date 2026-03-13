"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStaffRecords = listStaffRecords;
exports.createStaffRecord = createStaffRecord;
exports.patchStaffRecord = patchStaffRecord;
const prisma_1 = require("../config/prisma");
const httpError_1 = require("../utils/httpError");
const EMP_START = 273;
const staffRecordDelegate = prisma_1.prisma.staffRecord;
const parseEmployeeNumber = (employeeId) => {
    const m = /^EMP-(\d{4,6})$/.exec(String(employeeId || '').trim());
    if (!m)
        return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
};
const parseDateOnly = (value) => {
    const v = String(value || '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m)
        throw new httpError_1.HttpError(400, 'INVALID_DATE', 'date must be YYYY-MM-DD');
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
    if (isNaN(d.getTime()))
        throw new httpError_1.HttpError(400, 'INVALID_DATE', 'date must be valid');
    return d;
};
const toDateOnlyIso = (d) => d.toISOString().slice(0, 10);
const sanitize = (r) => ({
    id: r.id,
    employeeId: r.employeeId,
    fullName: r.fullName,
    email: r.email,
    status: r.status,
    age: r.age,
    nationalId: r.nationalId,
    placeFrom: r.placeFrom,
    salaryPerMonth: r.salaryPerMonth,
    allowance: r.allowance,
    date: toDateOnlyIso(r.date),
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
});
async function generateEmployeeIdForBusiness(businessId) {
    const [staffIds, userIds] = (await Promise.all([
        staffRecordDelegate.findMany({ where: { businessId }, select: { employeeId: true } }),
        prisma_1.prisma.user.findMany({ where: { businessId }, select: { employeeId: true } })
    ]));
    let max = 0;
    for (const s of staffIds) {
        const n = s.employeeId ? parseEmployeeNumber(s.employeeId) : null;
        if (n && n > max)
            max = n;
    }
    for (const u of userIds) {
        const n = u.employeeId ? parseEmployeeNumber(u.employeeId) : null;
        if (n && n > max)
            max = n;
    }
    let n = Math.max(EMP_START, max + 1);
    for (let i = 0; i < 20000; i += 1) {
        const candidate = `EMP-${String(n).padStart(5, '0')}`;
        const exists = staffIds.some((x) => x.employeeId === candidate) || userIds.some((x) => x.employeeId === candidate);
        if (!exists)
            return candidate;
        n += 1;
    }
    return `EMP-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
}
async function listStaffRecords(businessId) {
    const list = (await staffRecordDelegate.findMany({
        where: { businessId },
        orderBy: [{ id: 'asc' }]
    }));
    return list.map((r) => sanitize(r));
}
async function createStaffRecord(businessId, input) {
    const employeeId = input.employeeId ? String(input.employeeId).trim() : '';
    const resolvedEmployeeId = employeeId || (await generateEmployeeIdForBusiness(businessId));
    const existing = await staffRecordDelegate.findFirst({
        where: { businessId, employeeId: resolvedEmployeeId }
    });
    if (existing)
        throw new httpError_1.HttpError(409, 'EMPLOYEE_ID_EXISTS', 'Employee ID already exists');
    const created = await staffRecordDelegate.create({
        data: {
            businessId,
            employeeId: resolvedEmployeeId,
            fullName: String(input.fullName || '').trim(),
            email: input.email ? String(input.email).trim() : null,
            status: input.status ? String(input.status).trim() : 'live',
            age: Number(input.age),
            nationalId: String(input.nationalId || '').trim(),
            placeFrom: input.placeFrom ? String(input.placeFrom).trim() : null,
            salaryPerMonth: Number(input.salaryPerMonth),
            allowance: input.allowance != null ? Number(input.allowance) : 0,
            date: parseDateOnly(String(input.date || '')),
            message: input.message ? String(input.message).trim() : null
        }
    });
    return sanitize(created);
}
async function patchStaffRecord(businessId, id, input) {
    const existing = await staffRecordDelegate.findFirst({ where: { id, businessId } });
    if (!existing)
        throw new httpError_1.HttpError(404, 'NOT_FOUND', 'Staff record not found');
    const data = {};
    if (input.fullName !== undefined)
        data.fullName = String(input.fullName || '').trim();
    if (input.email !== undefined)
        data.email = input.email ? String(input.email).trim() : null;
    if (input.status !== undefined)
        data.status = String(input.status || '').trim();
    if (input.age !== undefined)
        data.age = Number(input.age);
    if (input.nationalId !== undefined)
        data.nationalId = String(input.nationalId || '').trim();
    if (input.placeFrom !== undefined)
        data.placeFrom = input.placeFrom ? String(input.placeFrom).trim() : null;
    if (input.salaryPerMonth !== undefined)
        data.salaryPerMonth = Number(input.salaryPerMonth);
    if (input.allowance !== undefined)
        data.allowance = Number(input.allowance);
    if (input.date !== undefined)
        data.date = parseDateOnly(String(input.date || ''));
    if (input.message !== undefined)
        data.message = input.message ? String(input.message).trim() : null;
    const updated = await staffRecordDelegate.update({ where: { id: existing.id }, data });
    return sanitize(updated);
}
