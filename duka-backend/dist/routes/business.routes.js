"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const business_controller_1 = require("../controllers/business.controller");
const asyncHandler_1 = require("../utils/asyncHandler");
exports.businessRouter = (0, express_1.Router)();
exports.businessRouter.get('/me', auth_1.requireAuth, auth_1.requireActiveSubscription, (0, asyncHandler_1.asyncHandler)(business_controller_1.businessMeHandler));
