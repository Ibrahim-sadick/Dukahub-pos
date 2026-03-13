"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentSubscriptionHandler = currentSubscriptionHandler;
exports.selectPlanHandler = selectPlanHandler;
exports.confirmPaymentHandler = confirmPaymentHandler;
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
const subscriptions_service_1 = require("../services/subscriptions.service");
async function currentSubscriptionHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const sub = await (0, subscriptions_service_1.getCurrentSubscription)(businessId);
    res.json((0, apiResponse_1.ok)(sub));
}
async function selectPlanHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const sub = await (0, subscriptions_service_1.selectPlan)(businessId, req.body);
    res.status(201).json((0, apiResponse_1.ok)(sub));
}
async function confirmPaymentHandler(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId)
        throw new httpError_1.HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
    const result = await (0, subscriptions_service_1.confirmPayment)(businessId, req.body);
    res.status(201).json((0, apiResponse_1.ok)(result));
}
