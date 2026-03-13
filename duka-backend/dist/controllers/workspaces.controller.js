"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWorkspacesHandler = listWorkspacesHandler;
exports.createWorkspaceHandler = createWorkspaceHandler;
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
const workspaces_service_1 = require("../services/workspaces.service");
async function listWorkspacesHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const list = await (0, workspaces_service_1.listWorkspaces)(businessId);
    res.json((0, apiResponse_1.ok)(list));
}
async function createWorkspaceHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const created = await (0, workspaces_service_1.createWorkspace)(businessId, req.body);
    res.status(201).json((0, apiResponse_1.ok)(created));
}
