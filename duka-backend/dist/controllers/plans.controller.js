"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlansHandler = listPlansHandler;
const apiResponse_1 = require("../utils/apiResponse");
const plans_service_1 = require("../services/plans.service");
async function listPlansHandler(_req, res) {
    const plans = await (0, plans_service_1.listPlans)();
    res.json((0, apiResponse_1.ok)(plans));
}
