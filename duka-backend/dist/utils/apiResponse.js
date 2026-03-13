"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.fail = fail;
function ok(data) {
    return { success: true, data };
}
function fail(code, message, details) {
    return { success: false, error: { code, message, details } };
}
