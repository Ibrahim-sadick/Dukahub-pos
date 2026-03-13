"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkspaceSchema = void 0;
const zod_1 = require("zod");
exports.createWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    location: zod_1.z.string().optional(),
    isMain: zod_1.z.boolean().optional()
});
