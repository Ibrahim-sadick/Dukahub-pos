"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMpiraPayment = verifyMpiraPayment;
const https_1 = __importDefault(require("https"));
const httpError_1 = require("../utils/httpError");
const MPIRA_BASE = 'https://mpira.online';
const requestJson = async (url, { method = 'GET' } = {}) => {
    if (typeof globalThis.fetch === 'function') {
        const res = await globalThis.fetch(url, {
            method,
            headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
            cache: 'no-store'
        });
        let data = null;
        try {
            data = await res.json();
        }
        catch { }
        return { ok: Boolean(res.ok), status: Number(res.status), data };
    }
    return await new Promise((resolve) => {
        const req = https_1.default.request(url, {
            method,
            headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
        }, (res) => {
            let body = '';
            res.on('data', (c) => (body += String(c || '')));
            res.on('end', () => {
                let data = null;
                try {
                    data = JSON.parse(body);
                }
                catch { }
                resolve({ ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300, status: res.statusCode || 0, data });
            });
        });
        req.on('error', () => resolve({ ok: false, status: 0, data: null }));
        req.end();
    });
};
const normalizeStatus = (payload) => {
    const st = String(payload?.status || payload?.data?.status || payload?.data?.payment_status || payload?.payment_status || payload?.state || '')
        .trim()
        .toLowerCase();
    if (!st)
        return '';
    if (st === 'success' || st === 'completed' || st === 'paid')
        return 'success';
    if (st.includes('expire'))
        return 'expired';
    if (st === 'pending' || st === 'processing' || st === 'waiting')
        return 'pending';
    return st;
};
const extractAmount = (payload) => {
    const candidates = [
        payload?.amount,
        payload?.data?.amount,
        payload?.data?.amount?.value,
        payload?.data?.amountPaid,
        payload?.data?.paidAmount
    ];
    for (const v of candidates) {
        const n = Number(v);
        if (Number.isFinite(n))
            return n;
    }
    return null;
};
async function verifyMpiraPayment(reference) {
    const ref = String(reference || '').trim();
    if (!ref)
        throw new httpError_1.HttpError(400, 'MISSING_REFERENCE', 'reference is required');
    const url = `${MPIRA_BASE}/api/payment/status?reference=${encodeURIComponent(ref)}`;
    const res = await requestJson(url, { method: 'GET' });
    if (!res.ok) {
        const message = String(res.data?.message || res.data?.error || `Payment verification failed (${res.status || 0})`);
        throw new httpError_1.HttpError(502, 'PAYMENT_PROVIDER_ERROR', message, { provider: 'mpira', reference: ref, status: res.status || 0 });
    }
    const status = normalizeStatus(res.data);
    const amount = extractAmount(res.data);
    return { status, amount, raw: res.data };
}
