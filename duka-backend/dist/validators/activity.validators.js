"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActivitySchema = void 0;
const zod_1 = require("zod");
exports.createActivitySchema = zod_1.z.object({
    action: zod_1.z.string().min(1),
    entityType: zod_1.z.string().min(1),
    entityId: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1),
    details: zod_1.z.any().optional()
});
