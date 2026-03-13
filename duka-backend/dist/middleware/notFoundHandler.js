"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
const apiResponse_1 = require("../utils/apiResponse");
function notFoundHandler(_req, res) {
    res.status(404).json((0, apiResponse_1.fail)('NOT_FOUND', 'Route not found'));
}
