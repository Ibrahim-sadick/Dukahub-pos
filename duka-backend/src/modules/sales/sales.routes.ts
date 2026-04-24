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
import { deleteSaleHistoryOnly } from '../../shared/history-delete';
import { applyStockAdjustment } from '../../shared/inventory';

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.get(
  '/',
  requirePermission('sales.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const sales = await prisma.sale.findMany({
      where: { businessId: String(req.auth?.businessId) },
      include: { items: true, customer: true, createdBy: true },
      orderBy: { saleDate: 'desc' }
    });

    res.json({ success: true, data: { sales } });
  })
);

salesRouter.post(
  '/',
  requirePermission('sales.create'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const customerId = req.body.customerId ? String(req.body.customerId) : null;
    const productIds: string[] = Array.from(
      new Set(
        items
          .map((item: any) => (item?.productId ? String(item.productId) : ''))
          .filter((value: string): value is string => Boolean(value))
      )
    );

    if (items.length === 0) {
      throw new ApiError(400, 'At least one sale item is required', 'SALE_ITEMS_REQUIRED');
    }

    const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: { businessId: true }
        });

        if (!customer) {
          throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
        }

        assertEntityOwnership(customer.businessId, businessId);
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

      const saleNumber = req.body.saleNumber || (await getNextDocumentNumber(tx, businessId, 'sale', 'SO', 4));
      const invoiceNumber = req.body.invoiceNumber || (await getNextDocumentNumber(tx, businessId, 'invoice', 'INV', 5));

      const createdSale = await tx.sale.create({
        data: {
          businessId,
          customerId,
          createdById: userId || null,
          updatedById: userId || null,
          saleNumber,
          invoiceNumber,
          poNumber: req.body.poNumber || null,
          customerName: req.body.customerName || null,
          customerEmail: req.body.customerEmail || null,
          customerPhone: req.body.customerPhone || null,
          customerAddress: req.body.customerAddress || null,
          saleType: req.body.saleType || 'Retail',
          paymentMethod: req.body.paymentMethod || 'Cash',
          status: req.body.status || 'Completed',
          amount: Number(req.body.amount || req.body.finalTotal || 0),
          subtotal: Number(req.body.subtotal || 0),
          tax: Number(req.body.tax || 0),
          taxRate: Number(req.body.taxRate || 0),
          shipping: Number(req.body.shipping || 0),
          discount: Number(req.body.discount || 0),
          finalTotal: Number(req.body.finalTotal || req.body.amount || 0),
          amountPaid: Number(req.body.amountPaid || req.body.finalTotal || 0),
          balanceDue: Number(req.body.balanceDue || 0),
          paymentTerms: req.body.paymentTerms || null,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
          saleDate: req.body.saleDate ? new Date(req.body.saleDate) : new Date(),
          notes: req.body.notes || null,
          description: req.body.description || null,
          metadata: req.body.metadata || undefined,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId || null,
              item: item.item || item.productName || item.name,
              productType: item.productType || null,
              productName: item.productName || item.name || item.item,
              qty: Number(item.qty || item.quantity || 0),
              unit: item.unit || 'pcs',
              price: Number(item.price || item.unitPrice || 0),
              total: Number(item.total || (Number(item.qty || item.quantity || 0) * Number(item.price || item.unitPrice || 0))),
              metadata: item.metadata || undefined
            }))
          }
        },
        include: { items: true }
      });

      for (const item of createdSale.items) {
        if (item.productId) {
          await applyStockAdjustment({
            tx,
            businessId,
            productId: item.productId,
            userId,
            movementType: 'SALE_OUT',
            quantityDelta: -Number(item.qty),
            referenceType: 'Sale',
            referenceId: createdSale.id,
            unitPrice: Number(item.price),
            notes: createdSale.saleNumber
          });
        }
      }

      return createdSale;
    });

    await recordActivity({
      businessId,
      userId,
      action: 'sale_create',
      title: 'Sale created',
      details: `${sale.saleNumber} created`,
      entityType: 'Sale',
      entityId: sale.id
    });

    res.status(201).json({ success: true, message: 'Sale created successfully', data: { sale } });
  })
);

salesRouter.patch(
  '/:saleId',
  requirePermission('sales.edit'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const saleId = String(req.params.saleId || '');
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const customerId = req.body.customerId ? String(req.body.customerId) : null;
    const productIds: string[] = Array.from(
      new Set(
        items
          .map((item: any) => (item?.productId ? String(item.productId) : ''))
          .filter((value: string): value is string => Boolean(value))
      )
    );

    if (items.length === 0) {
      throw new ApiError(400, 'At least one sale item is required', 'SALE_ITEMS_REQUIRED');
    }

    const existingSale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });

    if (!existingSale) {
      return res.status(404).json({ success: false, message: 'Sale not found', code: 'SALE_NOT_FOUND' });
    }

    assertEntityOwnership(existingSale.businessId, businessId);

    const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: { businessId: true }
        });

        if (!customer) {
          throw new ApiError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
        }

        assertEntityOwnership(customer.businessId, businessId);
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

      for (const item of existingSale.items) {
        if (item.productId) {
          await applyStockAdjustment({
            tx,
            businessId,
            productId: item.productId,
            userId,
            movementType: 'ADJUSTMENT_IN',
            quantityDelta: Number(item.qty),
            referenceType: 'SaleUpdateReversal',
            referenceId: existingSale.id,
            unitPrice: Number(item.price),
            notes: `Updated ${existingSale.saleNumber}`
          });
        }
      }

      await tx.saleItem.deleteMany({
        where: { saleId: existingSale.id }
      });

      const updatedSale = await tx.sale.update({
        where: { id: existingSale.id },
        data: {
          customerId,
          updatedById: userId || null,
          saleNumber: req.body.saleNumber || existingSale.saleNumber,
          invoiceNumber: req.body.invoiceNumber || existingSale.invoiceNumber,
          poNumber: req.body.poNumber || null,
          customerName: req.body.customerName || null,
          customerEmail: req.body.customerEmail || null,
          customerPhone: req.body.customerPhone || null,
          customerAddress: req.body.customerAddress || null,
          saleType: req.body.saleType || 'Retail',
          paymentMethod: req.body.paymentMethod || 'Cash',
          status: req.body.status || 'Completed',
          amount: Number(req.body.amount || req.body.finalTotal || 0),
          subtotal: Number(req.body.subtotal || 0),
          tax: Number(req.body.tax || 0),
          taxRate: Number(req.body.taxRate || 0),
          shipping: Number(req.body.shipping || 0),
          discount: Number(req.body.discount || 0),
          finalTotal: Number(req.body.finalTotal || req.body.amount || 0),
          amountPaid: Number(req.body.amountPaid || req.body.finalTotal || 0),
          balanceDue: Number(req.body.balanceDue || 0),
          paymentTerms: req.body.paymentTerms || null,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
          saleDate: req.body.saleDate ? new Date(req.body.saleDate) : existingSale.saleDate,
          notes: req.body.notes || null,
          description: req.body.description || null,
          metadata: req.body.metadata || undefined,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId || null,
              item: item.item || item.productName || item.name,
              productType: item.productType || null,
              productName: item.productName || item.name || item.item,
              qty: Number(item.qty || item.quantity || 0),
              unit: item.unit || 'pcs',
              price: Number(item.price || item.unitPrice || 0),
              total: Number(item.total || (Number(item.qty || item.quantity || 0) * Number(item.price || item.unitPrice || 0))),
              metadata: item.metadata || undefined
            }))
          }
        },
        include: { items: true }
      });

      for (const item of updatedSale.items) {
        if (item.productId) {
          await applyStockAdjustment({
            tx,
            businessId,
            productId: item.productId,
            userId,
            movementType: 'SALE_OUT',
            quantityDelta: -Number(item.qty),
            referenceType: 'SaleUpdate',
            referenceId: updatedSale.id,
            unitPrice: Number(item.price),
            notes: updatedSale.saleNumber
          });
        }
      }

      return updatedSale;
    });

    await recordActivity({
      businessId,
      userId,
      action: 'sale_update',
      title: 'Sale updated',
      details: `${sale.saleNumber} updated`,
      entityType: 'Sale',
      entityId: sale.id
    });

    res.json({ success: true, message: 'Sale updated successfully', data: { sale } });
  })
);

salesRouter.delete(
  '/:saleId',
  requirePermission('sales.delete'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const saleId = String(req.params.saleId || '');
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found', code: 'SALE_NOT_FOUND' });
    }

    assertEntityOwnership(sale.businessId, businessId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await deleteSaleHistoryOnly(tx, businessId, sale.id);
      await tx.sale.delete({ where: { id: sale.id } });
    });

    await recordActivity({
      businessId,
      userId,
      action: 'sale_delete',
      title: 'Sale deleted',
      details: `${sale.saleNumber} deleted`,
      entityType: 'Sale',
      entityId: sale.id
    });

    res.json({ success: true, message: 'Sale deleted successfully', data: { id: sale.id } });
  })
);
