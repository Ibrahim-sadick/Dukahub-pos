"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessMeHandler = businessMeHandler;
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
const business_service_1 = require("../services/business.service");
async function businessMeHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const business = await (0, business_service_1.getBusinessMe)(businessId);
    res.json((0, apiResponse_1.ok)(business));
}
