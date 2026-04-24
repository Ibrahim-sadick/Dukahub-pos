import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';
import { permissionCatalog } from '../../constants/permissions';
import { recordActivity } from '../../shared/activity-log';
import { assertEntityOwnership } from '../../shared/documents';

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

rolesRouter.get(
  '/',
  requirePermission('roles.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        where: { businessId: String(req.auth?.businessId) },
        include: { permissions: { include: { permission: true } }, users: true },
        orderBy: { name: 'asc' }
      }),
      prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] })
    ]);

    res.json({ success: true, data: { roles, permissions, catalog: permissionCatalog } });
  })
);

rolesRouter.post(
  '/',
  requirePermission('roles.manage'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const permissionKeys = Array.isArray(req.body.permissionKeys) ? req.body.permissionKeys : [];
    const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

    const role = await prisma.role.create({
      data: {
        businessId: String(req.auth?.businessId),
        name: req.body.name,
        code: req.body.code,
        description: req.body.description || null,
        isSystem: false,
        permissions: {
          create: permissions.map((permission: { id: any; }) => ({ permissionId: permission.id }))
        }
      },
      include: { permissions: { include: { permission: true } } }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'role_create',
      title: 'Role created',
      details: `${role.name} role created`,
      entityType: 'Role',
      entityId: role.id
    });

    res.status(201).json({ success: true, message: 'Role created successfully', data: { role } });
  })
);

rolesRouter.patch(
  '/:roleId',
  requirePermission('roles.manage'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const permissionKeys = Array.isArray(req.body.permissionKeys) ? req.body.permissionKeys : [];
    const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

    const existingRole = await prisma.role.findUnique({
      where: { id: String(req.params.roleId) }
    });

    if (!existingRole) {
      return res.status(404).json({ success: false, message: 'Role not found', code: 'ROLE_NOT_FOUND' });
    }

    assertEntityOwnership(existingRole.businessId, String(req.auth?.businessId));

    await prisma.rolePermission.deleteMany({ where: { roleId: existingRole.id } });

    const role = await prisma.role.update({
      where: { id: existingRole.id },
      data: {
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        permissions: {
          create: permissions.map((permission: { id: any; }) => ({ permissionId: permission.id }))
        }
      },
      include: { permissions: { include: { permission: true } } }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'role_update',
      title: 'Role updated',
      details: `${role.name} role updated`,
      entityType: 'Role',
      entityId: role.id
    });

    res.json({ success: true, message: 'Role updated successfully', data: { role } });
  })
);
