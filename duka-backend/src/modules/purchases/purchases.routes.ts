import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';
import { recordActivity } from '../../shared/activity-log';
import { getNextDocumentNumber, assertEntityOwnership } from '../../shared/documents';
import { ApiError } from '../../shared/errors';
import { applyStockAdjustment } from '../../shared/inventory';

export const purchasesRouter = Router();

purchasesRouter.use(requireAuth);

purchasesRouter.get(
  '/',
  requirePermission('purchases.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const purchases = await prisma.purchase.findMany({
      where: { businessId: String(req.auth?.businessId) },
      include: { items: true, supplier: true, createdBy: true },
      orderBy: { purchaseDate: 'desc' }
    });

    res.json({ success: true, data: { purchases } });
  })
);

purchasesRouter.get(
  '/next-number',
  requirePermission('purchases.create'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const counter = await prisma.documentCounter.findUnique({
      where: { businessId_key: { businessId, key: 'purchase' } },
      select: { prefix: true, nextValue: true, padding: true }
    });

    const prefix = counter?.prefix || 'PO';
    const nextValue = Number(counter?.nextValue || 1);
    const padding = Number(counter?.padding || 5);
    const purchaseNumber = `${prefix}${String(nextValue).padStart(padding, '0')}`;

    res.json({ success: true, data: { purchaseNumber } });
  })
);

purchasesRouter.post(
  '/',
  requirePermission('purchases.create'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const supplierId = req.body.supplierId ? String(req.body.supplierId) : null;
    const productIds: string[] = Array.from(
      new Set(
        items
          .map((item: any) => (item?.productId ? String(item.productId) : ''))
          .filter((value: string): value is string => Boolean(value))
      )
    );

    if (items.length === 0) {
      throw new ApiError(400, 'At least one purchase item is required', 'PURCHASE_ITEMS_REQUIRED');
    }

    const purchase = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (supplierId) {
        const supplier = await tx.supplier.findUnique({
          where: { id: supplierId },
          select: { businessId: true }
        });

        if (!supplier) {
          throw new ApiError(404, 'Supplier not found', 'SUPPLIER_NOT_FOUND');
        }

        assertEntityOwnership(supplier.businessId, businessId);
      }

      if (productIds.length > 0) {
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, businessId: true }
        });

        if (products.length !== productIds.length) {
          throw new ApiError(404, 'One or more products were not found', 'PRODUCT_NOT_FOUND');
        }

        for (const product of products) {
          assertEntityOwnership(product.businessId, businessId);
        }
      }

      const purchaseNumber = req.body.purchaseNumber || (await getNextDocumentNumber(tx, businessId, 'purchase', 'PO', 5));

      const createdPurchase = await tx.purchase.create({
        data: {
          businessId,
          supplierId,
          createdById: userId || null,
          updatedById: userId || null,
          purchaseNumber,
          supplierName: req.body.supplierName || null,
          supplierPhone: req.body.supplierPhone || null,
          invoiceNumber: req.body.invoiceNumber || null,
          destination: req.body.destination || 'Main Store',
          status: req.body.status || 'Received',
          paymentStatus: req.body.paymentStatus || 'Paid',
          subtotal: Number(req.body.subtotal || 0),
          tax: Number(req.body.tax || 0),
          discount: Number(req.body.discount || 0),
          total: Number(req.body.total || 0),
          amountPaid: Number(req.body.amountPaid || req.body.total || 0),
          balanceDue: Number(req.body.balanceDue || 0),
          purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(),
          receivedDate: req.body.receivedDate ? new Date(req.body.receivedDate) : null,
          notes: req.body.notes || null,
          metadata: req.body.metadata || undefined,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId || null,
              itemName: item.itemName || item.productName || item.name,
              productType: item.productType || null,
              quantity: Number(item.quantity || item.qty || 0),
              unit: item.unit || 'pcs',
              unitCost: Number(item.unitCost || item.costPrice || 0),
              total: Number(item.total || (Number(item.quantity || item.qty || 0) * Number(item.unitCost || item.costPrice || 0))),
              metadata: item.metadata || undefined
            }))
          }
        },
        include: { items: true }
      });

      for (const item of createdPurchase.items) {
        if (item.productId) {
          await applyStockAdjustment({
            tx,
            businessId,
            productId: item.productId,
            userId,
            movementType: 'PURCHASE_IN',
            quantityDelta: Number(item.quantity),
            referenceType: 'Purchase',
            referenceId: createdPurchase.id,
            unitCost: Number(item.unitCost),
            notes: createdPurchase.purchaseNumber
          });
        }
      }

      return createdPurchase;
    });

    await recordActivity({
      businessId,
      userId,
      action: 'purchase_create',
      title: 'Purchase created',
      details: `${purchase.purchaseNumber} created`,
      entityType: 'Purchase',
      entityId: purchase.id
    });

    res.status(201).json({ success: true, message: 'Purchase created successfully', data: { purchase } });
  })
);

purchasesRouter.delete(
  '/:purchaseId',
  requirePermission('purchases.delete'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const purchaseId = String(req.params.purchaseId || '');
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found', code: 'PURCHASE_NOT_FOUND' });
    }

    assertEntityOwnership(purchase.businessId, businessId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of purchase.items) {
        if (item.productId) {
          await applyStockAdjustment({
            tx,
            businessId,
            productId: item.productId,
            userId,
            movementType: 'ADJUSTMENT_OUT',
            quantityDelta: -Number(item.quantity),
            referenceType: 'PurchaseDeletion',
            referenceId: purchase.id,
            unitCost: Number(item.unitCost),
            notes: `Deleted ${purchase.purchaseNumber}`
          });
        }
      }

      await tx.purchase.delete({ where: { id: purchase.id } });
    });

    await recordActivity({
      businessId,
      userId,
      action: 'purchase_delete',
      title: 'Purchase deleted',
      details: `${purchase.purchaseNumber} deleted`,
      entityType: 'Purchase',
      entityId: purchase.id
    });

    res.json({ success: true, message: 'Purchase deleted successfully', data: { id: purchase.id } });
  })
);
