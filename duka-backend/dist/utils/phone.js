"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTzPhone = normalizeTzPhone;
exports.formatTzPhoneDisplay = formatTzPhoneDisplay;
function normalizeTzPhone(raw) {
    const digits = String(raw || '').replace(/[^0-9]/g, '');
    if (!digits)
        return null;
    const local = (() => {
        if (digits.startsWith('255'))
            return digits.slice(3);
        if (digits.startsWith('0'))
            return digits.slice(1);
        return digits;
    })().replace(/^0+/, '');
    if (local.length !== 9)
        return null;
    if (!(local.startsWith('6') || local.startsWith('7')))
        return null;
    return `255${local}`;
}
function formatTzPhoneDisplay(normalized) {
    const digits = String(normalized || '').replace(/[^0-9]/g, '');
    const local = digits.startsWith('255') ? digits.slice(3) : digits;
    return local ? `+255 ${local}` : '';
}
