"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStaffRecordsHandler = listStaffRecordsHandler;
exports.createStaffRecordHandler = createStaffRecordHandler;
exports.patchStaffRecordHandler = patchStaffRecordHandler;
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
const staffRecords_service_1 = require("../services/staffRecords.service");
async function listStaffRecordsHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const list = await (0, staffRecords_service_1.listStaffRecords)(businessId);
    res.json((0, apiResponse_1.ok)(list));
}
async function createStaffRecordHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const created = await (0, staffRecords_service_1.createStaffRecord)(businessId, req.body);
    res.status(201).json((0, apiResponse_1.ok)(created));
}
async function patchStaffRecordHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0)
        throw new httpError_1.HttpError(400, 'INVALID_ID', 'Invalid staff record id');
    const updated = await (0, staffRecords_service_1.patchStaffRecord)(businessId, id, req.body);
    res.json((0, apiResponse_1.ok)(updated));
}
