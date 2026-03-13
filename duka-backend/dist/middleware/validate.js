"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
function validateBody(schema) {
    return (req, _res, next) => {
        req.body = schema.parse(req.body);
        next();
    };
}
