"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plansRouter = void 0;
const express_1 = require("express");
const plans_controller_1 = require("../controllers/plans.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.plansRouter = (0, express_1.Router)();
exports.plansRouter.get('/', (0, asyncHandler_1.asyncHandler)(plans_controller_1.listPlansHandler));
