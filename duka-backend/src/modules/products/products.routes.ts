import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';
import { recordActivity } from '../../shared/activity-log';
import { assertEntityOwnership } from '../../shared/documents';
import { applyStockAdjustment } from '../../shared/inventory';

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get(
  '/',
  requirePermission('products.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const products = await prisma.product.findMany({
      where: { businessId: String(req.auth?.businessId) },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { products } });
  })
);

productsRouter.get(
  '/:productId/movements',
  requirePermission('inventory.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const movements = await prisma.stockMovement.findMany({
      where: {
        businessId: String(req.auth?.businessId),
        productId: String(req.params.productId)
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { movements } });
  })
);

productsRouter.post(
  '/',
  requirePermission('products.create'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const product = await prisma.product.create({
      data: {
        businessId: String(req.auth?.businessId),
        createdById: String(req.auth?.userId || ''),
        updatedById: String(req.auth?.userId || ''),
        name: req.body.name,
        sku: req.body.sku || null,
        barcode: req.body.barcode || null,
        productType: req.body.productType || null,
        category: req.body.category || null,
        brand: req.body.brand || null,
        unit: req.body.unit || 'pcs',
        sellable: req.body.sellable ?? true,
        costPrice: Number(req.body.costPrice || 0),
        sellingPrice: Number(req.body.sellingPrice || 0),
        stockQuantity: Number(req.body.stockQuantity || 0),
        reorderLevel: Number(req.body.reorderLevel || 10),
        allowNegativeStock: req.body.allowNegativeStock ?? false,
        trackExpiryDates: req.body.trackExpiryDates ?? false,
        trackBatchNumbers: req.body.trackBatchNumbers ?? false,
        description: req.body.description || null,
        status: req.body.status || 'ACTIVE',
        metadata: req.body.metadata || undefined
      }
    });

    if (Number(req.body.stockQuantity || 0) !== 0) {
      await prisma.stockMovement.create({
        data: {
          businessId: String(req.auth?.businessId),
          productId: product.id,
          userId: String(req.auth?.userId || ''),
          movementType: 'OPENING_BALANCE',
          referenceType: 'Product',
          referenceId: product.id,
          quantityDelta: Number(req.body.stockQuantity || 0),
          unit: product.unit,
          unitCost: Number(req.body.costPrice || 0),
          unitPrice: Number(req.body.sellingPrice || 0),
          notes: 'Opening stock'
        }
      });
    }

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'product_create',
      title: 'Product created',
      details: `${product.name} created`,
      entityType: 'Product',
      entityId: product.id
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: { product } });
  })
);

productsRouter.post(
  '/:productId/stock-in',
  requirePermission('inventory.adjust'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const productId = String(req.params.productId || '');
    const quantity = Number(req.body?.quantity || 0);

    if (!(quantity > 0)) {
      return res.status(400).json({ success: false, message: 'Enter a valid stock quantity', code: 'INVALID_STOCK_QUANTITY' });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    assertEntityOwnership(existingProduct.businessId, businessId);

    const referenceId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await applyStockAdjustment({
        tx,
        businessId,
        productId,
        userId,
        movementType: 'ADJUSTMENT_IN',
        quantityDelta: quantity,
        referenceType: 'ManualStockIn',
        referenceId,
        unitCost: Number(req.body?.unitCost || existingProduct.costPrice || 0),
        notes: req.body?.notes || 'Stock in'
      });
    });

    const [product, movement] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.stockMovement.findFirst({
        where: {
          businessId,
          productId,
          referenceType: 'ManualStockIn',
          referenceId
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    await recordActivity({
      businessId,
      userId,
      action: 'product_stock_in',
      title: 'Product stock added',
      details: `${existingProduct.name} stock increased by ${quantity}`,
      entityType: 'Product',
      entityId: productId
    });

    res.status(201).json({ success: true, message: 'Stock added successfully', data: { product, movement } });
  })
);

productsRouter.post(
  '/:productId/stock-out',
  requirePermission('inventory.adjust'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const productId = String(req.params.productId || '');
    const quantity = Number(req.body?.quantity || 0);

    if (!(quantity > 0)) {
      return res.status(400).json({ success: false, message: 'Enter a valid stock quantity', code: 'INVALID_STOCK_QUANTITY' });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    assertEntityOwnership(existingProduct.businessId, businessId);

    const referenceId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await applyStockAdjustment({
        tx,
        businessId,
        productId,
        userId,
        movementType: 'ADJUSTMENT_OUT',
        quantityDelta: -quantity,
        referenceType: 'ManualStockOut',
        referenceId,
        unitPrice: Number(req.body?.unitPrice || existingProduct.sellingPrice || 0),
        notes: req.body?.notes || 'Stock out'
      });
    });

    const [product, movement] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.stockMovement.findFirst({
        where: {
          businessId,
          productId,
          referenceType: 'ManualStockOut',
          referenceId
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    await recordActivity({
      businessId,
      userId,
      action: 'product_stock_out',
      title: 'Product stock removed',
      details: `${existingProduct.name} stock decreased by ${quantity}`,
      entityType: 'Product',
      entityId: productId
    });

    res.status(201).json({ success: true, message: 'Stock removed successfully', data: { product, movement } });
  })
);

productsRouter.patch(
  '/:productId',
  requirePermission('products.edit'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const existingProduct = await prisma.product.findUnique({
      where: { id: String(req.params.productId) }
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    assertEntityOwnership(existingProduct.businessId, String(req.auth?.businessId));

    const product = await prisma.product.update({
      where: { id: String(req.params.productId) },
      data: {
        updatedById: String(req.auth?.userId || ''),
        name: req.body.name,
        sku: req.body.sku,
        barcode: req.body.barcode,
        productType: req.body.productType,
        category: req.body.category,
        brand: req.body.brand,
        unit: req.body.unit,
        sellable: req.body.sellable,
        costPrice: req.body.costPrice,
        sellingPrice: req.body.sellingPrice,
        reorderLevel: req.body.reorderLevel,
        allowNegativeStock: req.body.allowNegativeStock,
        trackExpiryDates: req.body.trackExpiryDates,
        trackBatchNumbers: req.body.trackBatchNumbers,
        description: req.body.description,
        status: req.body.status,
        metadata: req.body.metadata
      }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'product_update',
      title: 'Product updated',
      details: `${product.name} updated`,
      entityType: 'Product',
      entityId: product.id
    });

    res.json({ success: true, message: 'Product updated successfully', data: { product } });
  })
);

productsRouter.delete(
  '/:productId',
  requirePermission('products.delete'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const productId = String(req.params.productId || '');
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: {
            saleItems: true,
            purchaseItems: true
          }
        }
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    assertEntityOwnership(existingProduct.businessId, businessId);

    if (Number(existingProduct._count?.saleItems || 0) > 0 || Number(existingProduct._count?.purchaseItems || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'This product cannot be deleted because it is already used in sales or purchases.',
        code: 'PRODUCT_DELETE_BLOCKED'
      });
    }

    await prisma.product.delete({
      where: { id: productId }
    });

    await recordActivity({
      businessId,
      userId,
      action: 'product_delete',
      title: 'Product deleted',
      details: `${existingProduct.name} deleted`,
      entityType: 'Product',
      entityId: productId
    });

    res.json({ success: true, message: 'Product deleted successfully', data: { id: productId } });
  })
);
