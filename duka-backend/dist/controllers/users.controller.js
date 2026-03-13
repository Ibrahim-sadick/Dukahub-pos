"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsersHandler = listUsersHandler;
exports.createUserHandler = createUserHandler;
exports.patchUserHandler = patchUserHandler;
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
const users_service_1 = require("../services/users.service");
async function listUsersHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const users = await (0, users_service_1.listUsers)(businessId);
    res.json((0, apiResponse_1.ok)(users));
}
async function createUserHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const user = await (0, users_service_1.createUser)(businessId, req.body);
    res.status(201).json((0, apiResponse_1.ok)(user));
}
async function patchUserHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
        throw new httpError_1.HttpError(400, 'INVALID_ID', 'Invalid user id');
    const user = await (0, users_service_1.patchUser)(businessId, id, req.body);
    res.json((0, apiResponse_1.ok)(user));
}
