import { prisma } from '../config/prisma';
import { HttpError } from '../utils/httpError';

export async function listWorkspaces(businessId: number) {
  const list = await prisma.workspace.findMany({
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

export async function createWorkspace(businessId: number, input: { name: string; location?: string; isMain?: boolean }) {
  const name = String(input.name || '').trim();
  if (!name) throw new HttpError(400, 'INVALID_NAME', 'Workspace name is required');

  const created = await prisma.workspace.create({
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

