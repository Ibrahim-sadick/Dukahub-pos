"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        res.status(400).json((0, apiResponse_1.fail)('VALIDATION_ERROR', 'Invalid request payload', err.flatten()));
        return;
    }
    if (err instanceof httpError_1.HttpError) {
        res.status(err.status).json((0, apiResponse_1.fail)(err.code, err.message, err.details));
        return;
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json((0, apiResponse_1.fail)('INTERNAL_ERROR', message));
}
