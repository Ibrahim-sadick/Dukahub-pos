import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';
import { recordActivity } from '../../shared/activity-log';
import { assertEntityOwnership } from '../../shared/documents';

export const customersRouter = Router();

customersRouter.use(requireAuth, requirePermission('customers.view'));

customersRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const customers = await prisma.customer.findMany({
      where: { businessId: String(req.auth?.businessId) },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: { customers } });
  })
);

customersRouter.post(
  '/',
  requirePermission('customers.edit'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const customer = await prisma.customer.create({
      data: {
        businessId: String(req.auth?.businessId),
        name: req.body.name,
        phone: req.body.phone || null,
        email: req.body.email || null,
        address: req.body.address || null,
        customerType: req.body.customerType || null,
        notes: req.body.notes || null,
        openingBalance: Number(req.body.openingBalance || 0),
        isActive: req.body.isActive ?? true
      }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'customer_create',
      title: 'Customer created',
      details: `${customer.name} added to customers`,
      entityType: 'Customer',
      entityId: customer.id
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', data: { customer } });
  })
);

customersRouter.patch(
  '/:customerId',
  requirePermission('customers.edit'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: String(req.params.customerId) }
    });

    if (!existingCustomer) {
      return res.status(404).json({ success: false, message: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
    }

    assertEntityOwnership(existingCustomer.businessId, String(req.auth?.businessId));

    const customer = await prisma.customer.update({
      where: { id: String(req.params.customerId) },
      data: {
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        address: req.body.address,
        customerType: req.body.customerType,
        notes: req.body.notes,
        openingBalance: req.body.openingBalance,
        isActive: req.body.isActive
      }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'customer_update',
      title: 'Customer updated',
      details: `${customer.name} updated`,
      entityType: 'Customer',
      entityId: customer.id
    });

    res.json({ success: true, message: 'Customer updated successfully', data: { customer } });
  })
);

customersRouter.delete(
  '/:customerId',
  requirePermission('customers.edit'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const customerId = String(req.params.customerId || '');
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!existingCustomer) {
      return res.status(404).json({ success: false, message: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
    }

    assertEntityOwnership(existingCustomer.businessId, businessId);

    const linkedSalesCount = await prisma.sale.count({
      where: {
        businessId,
        customerId
      }
    });

    if (linkedSalesCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Customer cannot be deleted because it is linked to existing sales records.',
        code: 'CUSTOMER_HAS_SALES'
      });
    }

    await prisma.customer.delete({
      where: { id: customerId }
    });

    await recordActivity({
      businessId,
      userId,
      action: 'customer_delete',
      title: 'Customer deleted',
      details: `${existingCustomer.name} deleted`,
      entityType: 'Customer',
      entityId: existingCustomer.id
    });

    res.json({ success: true, message: 'Customer deleted successfully', data: { id: customerId } });
  })
);
