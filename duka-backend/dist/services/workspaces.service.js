"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWorkspaces = listWorkspaces;
exports.createWorkspace = createWorkspace;
const prisma_1 = require("../config/prisma");
const httpError_1 = require("../utils/httpError");
async function listWorkspaces(businessId) {
    const list = await prisma_1.prisma.workspace.findMany({
        where: { businessId },
        orderBy: [{ isMain: 'desc' }, { id: 'asc' }]
    });
    return list.map((w) => ({
        id: w.id,
        name: w.name,
        location: w.location,
        isMain: w.isMain,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString()
    }));
}
async function createWorkspace(businessId, input) {
    const name = String(input.name || '').trim();
    if (!name)
        throw new httpError_1.HttpError(400, 'INVALID_NAME', 'Workspace name is required');
    const created = await prisma_1.prisma.workspace.create({
        data: {
            businessId,
            name,
            location: input.location || null,
            isMain: Boolean(input.isMain)
        }
    });
    return {
        id: created.id,
        name: created.name,
        location: created.location,
        isMain: created.isMain,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString()
    };
}
