import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';
import { recordActivity } from '../../shared/activity-log';
import { assertEntityOwnership } from '../../shared/documents';

export const suppliersRouter = Router();

suppliersRouter.use(requireAuth, requirePermission('suppliers.view'));

suppliersRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const suppliers = await prisma.supplier.findMany({
      where: { businessId: String(req.auth?.businessId) },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: { suppliers } });
  })
);

suppliersRouter.post(
  '/',
  requirePermission('suppliers.edit'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const supplier = await prisma.supplier.create({
      data: {
        businessId: String(req.auth?.businessId),
        name: req.body.name,
        contactPerson: req.body.contactPerson || null,
        phone: req.body.phone || null,
        email: req.body.email || null,
        address: req.body.address || null,
        notes: req.body.notes || null,
        openingBalance: Number(req.body.openingBalance || 0),
        inactive: req.body.inactive ?? false
      }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'supplier_create',
      title: 'Supplier created',
      details: `${supplier.name} added to suppliers`,
      entityType: 'Supplier',
      entityId: supplier.id
    });

    res.status(201).json({ success: true, message: 'Supplier created successfully', data: { supplier } });
  })
);

suppliersRouter.patch(
  '/:supplierId',
  requirePermission('suppliers.edit'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: String(req.params.supplierId) }
    });

    if (!existingSupplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found', code: 'SUPPLIER_NOT_FOUND' });
    }

    assertEntityOwnership(existingSupplier.businessId, String(req.auth?.businessId));

    const supplier = await prisma.supplier.update({
      where: { id: String(req.params.supplierId) },
      data: {
        name: req.body.name,
        contactPerson: req.body.contactPerson,
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address,
        notes: req.body.notes,
        openingBalance: req.body.openingBalance,
        inactive: req.body.inactive
      }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'supplier_update',
      title: 'Supplier updated',
      details: `${supplier.name} updated`,
      entityType: 'Supplier',
      entityId: supplier.id
    });

    res.json({ success: true, message: 'Supplier updated successfully', data: { supplier } });
  })
);
