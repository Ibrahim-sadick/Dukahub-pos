"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupHandler = signupHandler;
exports.loginAdminHandler = loginAdminHandler;
exports.loginStaffHandler = loginStaffHandler;
exports.logoutHandler = logoutHandler;
exports.meHandler = meHandler;
exports.passwordResetRequestHandler = passwordResetRequestHandler;
exports.passwordResetConfirmHandler = passwordResetConfirmHandler;
const apiResponse_1 = require("../utils/apiResponse");
const auth_service_1 = require("../services/auth.service");
const httpError_1 = require("../utils/httpError");
async function signupHandler(req, res) {
    const result = await (0, auth_service_1.signup)(req.body);
    res.status(201).json((0, apiResponse_1.ok)(result));
}
async function loginAdminHandler(req, res) {
    const result = await (0, auth_service_1.loginAdmin)(req.body);
    res.json((0, apiResponse_1.ok)(result));
}
async function loginStaffHandler(req, res) {
    const result = await (0, auth_service_1.loginStaff)(req.body);
    res.json((0, apiResponse_1.ok)(result));
}
async function logoutHandler(req, res) {
    const token = String(req.body?.refreshToken || '').trim();
    if (!token)
        throw new httpError_1.HttpError(400, 'MISSING_REFRESH_TOKEN', 'refreshToken is required');
    await (0, auth_service_1.logout)(token);
    res.json((0, apiResponse_1.ok)({}));
}
async function meHandler(req, res) {
    const userId = req.auth?.userId;
    if (!userId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const result = await (0, auth_service_1.getMe)(userId);
    res.json((0, apiResponse_1.ok)(result));
}
async function passwordResetRequestHandler(req, res) {
    const result = await (0, auth_service_1.requestPasswordReset)(req.body);
    res.json((0, apiResponse_1.ok)(result));
}
async function passwordResetConfirmHandler(req, res) {
    const result = await (0, auth_service_1.confirmPasswordReset)(req.body);
    res.json((0, apiResponse_1.ok)(result));
}
