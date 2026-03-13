"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActivityHandler = createActivityHandler;
exports.listActivityHandler = listActivityHandler;
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
const activity_service_1 = require("../services/activity.service");
async function createActivityHandler(req, res) {
    const userId = req.auth?.userId;
    const businessId = req.auth?.businessId;
    if (!userId || !businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const created = await (0, activity_service_1.createActivity)(businessId, userId, req.body);
    res.status(201).json((0, apiResponse_1.ok)(created));
}
async function listActivityHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const take = req.query?.take != null ? Number(req.query.take) : 200;
    const rows = await (0, activity_service_1.listActivity)(businessId, take);
    res.json((0, apiResponse_1.ok)(rows));
}
