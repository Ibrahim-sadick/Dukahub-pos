import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import { recordActivity } from '../../shared/activity-log';
import { DAMAGE_MOVEMENT_TYPE, DAMAGE_REFERENCE_TYPE } from '../../shared/damaged-stock';
import { ApiError } from '../../shared/errors';
import { deleteMovementHistoryOnly } from '../../shared/history-delete';
import { applyStockAdjustment } from '../../shared/inventory';
import type { AuthenticatedRequest } from '../../shared/types';

export const damagedStocksRouter = Router();

const DAMAGE_NUMBER_START = 7000;
const DAMAGE_NUMBER_PAD = 6;

damagedStocksRouter.use(requireAuth);

const normalizeText = (value: unknown) => String(value || '').trim();

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const asDateString = (value: unknown) => {
  const text = normalizeText(value);
  if (!text) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return new Date().toISOString().slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
};

const formatDamageNumber = (value: unknown) => {
  const parsed = parseInt(String(value ?? ''), 10);
  const safe = Number.isFinite(parsed) ? Math.max(DAMAGE_NUMBER_START, parsed) : DAMAGE_NUMBER_START;
  return String(safe).padStart(DAMAGE_NUMBER_PAD, '0');
};

const parseMetadataObject = (value: unknown) => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
};

type DamageMovement = {
  productId: string;
  quantityDelta: unknown;
  unitPrice: unknown;
  unitCost: unknown;
  unit: string | null;
  notes: string | null;
  metadata: unknown;
  referenceId: string | null;
  createdAt: Date;
  product: {
    name: string;
    unit: string;
    category: string | null;
    productType: string | null;
  } | null;
};

type DamageRecordItem = {
  productId: string;
  item: string;
  itemName: string;
  description: string;
  unit: string;
  qty: number;
  price: number;
  reason: string;
  restock: boolean;
  itemType: string;
};

type SanitizedDamageItem = {
  productId: string;
  item: string;
  description: string;
  unit: string;
  qty: number;
  price: number;
  reason: string;
  restock: boolean;
  itemType: string;
};

const buildDamageRecordFromMovements = (movements: DamageMovement[]) => {
  const rows = Array.isArray(movements) ? movements : [];
  const first = rows[0] || {};
  const firstMeta = parseMetadataObject(first?.metadata);
  const recordMeta = parseMetadataObject(firstMeta?.record);
  const items: DamageRecordItem[] = rows.map((movement) => {
    const metadata = parseMetadataObject(movement?.metadata);
    const itemMeta = parseMetadataObject(metadata?.item);
    const product = movement.product;
    const qty = Math.abs(toNumber(movement?.quantityDelta));
    const price = toNumber(itemMeta?.price ?? movement?.unitPrice ?? movement?.unitCost);
    return {
      productId: normalizeText(movement?.productId),
      item: normalizeText(itemMeta?.item || product?.name),
      itemName: normalizeText(itemMeta?.item || product?.name),
      description: normalizeText(itemMeta?.description),
      unit: normalizeText(itemMeta?.unit || movement?.unit || product?.unit) || 'item',
      qty,
      price,
      reason: normalizeText(itemMeta?.reason || movement?.notes),
      restock: itemMeta?.restock === false ? false : true,
      itemType: normalizeText(itemMeta?.itemType || product?.category || product?.productType || 'general') || 'general'
    };
  });

  const subtotal = items.reduce((sum, item) => sum + toNumber(item.qty) * toNumber(item.price), 0);
  const tax = toNumber(recordMeta?.tax);
  const restockFee = toNumber(recordMeta?.restockFee);
  const shippingReverse = toNumber(recordMeta?.shippingReverse);
  const lossTotal = toNumber(recordMeta?.lossTotal || subtotal + tax - restockFee - shippingReverse);
  const date = asDateString(recordMeta?.rmaDate || first?.createdAt);

  return {
    id: normalizeText(first?.referenceId),
    rmaNumber: normalizeText(recordMeta?.rmaNumber) || formatDamageNumber(DAMAGE_NUMBER_START),
    rmaDate: date,
    windowDays: normalizeText(recordMeta?.windowDays || '30') || '30',
    reportedBy: normalizeText(recordMeta?.reportedBy),
    name: normalizeText(recordMeta?.reportedBy),
    phone: normalizeText(recordMeta?.phone),
    notes: normalizeText(recordMeta?.notes),
    vatEnabled: Boolean(recordMeta?.vatEnabled),
    restockPercent: normalizeText(recordMeta?.restockPercent || '0') || '0',
    subtotal,
    tax,
    restockFee,
    shippingReverse,
    lossTotal,
    estimatedValue: lossTotal,
    amount: lossTotal,
    items,
    persisted: true,
    createdAt: normalizeText(first?.createdAt),
    updatedAt: normalizeText(rows[rows.length - 1]?.createdAt || first?.createdAt)
  };
};

const sortDamageRecords = (records: Array<ReturnType<typeof buildDamageRecordFromMovements>>) => {
  return (Array.isArray(records) ? records : []).slice().sort((left, right) => {
    const leftDate = normalizeText(left?.rmaDate || left?.createdAt);
    const rightDate = normalizeText(right?.rmaDate || right?.createdAt);
    if (leftDate !== rightDate) return leftDate < rightDate ? 1 : -1;
    const leftUpdated = normalizeText(left?.updatedAt || left?.createdAt);
    const rightUpdated = normalizeText(right?.updatedAt || right?.createdAt);
    return leftUpdated < rightUpdated ? 1 : leftUpdated > rightUpdated ? -1 : 0;
  });
};

const listDamageMovements = async (businessId: string, referenceId?: string) => {
  return prisma.stockMovement.findMany({
    where: {
      businessId,
      movementType: DAMAGE_MOVEMENT_TYPE,
      referenceType: DAMAGE_REFERENCE_TYPE,
      ...(referenceId ? { referenceId } : {})
    },
    include: { product: true },
    orderBy: { createdAt: 'asc' }
  });
};

const buildDamageRecords = (movements: DamageMovement[]) => {
  const grouped = new Map<string, DamageMovement[]>();
  (Array.isArray(movements) ? movements : []).forEach((movement) => {
    const key = normalizeText(movement?.referenceId);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(movement);
  });
  return sortDamageRecords(Array.from(grouped.values()).map((group) => buildDamageRecordFromMovements(group)));
};

const sanitizeDamageItems = (items: unknown) => {
  const rows = Array.isArray(items) ? items : [];
  const sanitized: SanitizedDamageItem[] = rows
    .map((item) => {
      const row = parseMetadataObject(item);
      return {
        productId: normalizeText(row?.productId),
        item: normalizeText(row?.item || row?.itemName),
        description: normalizeText(row?.description),
        unit: normalizeText(row?.unit) || 'item',
        qty: toNumber(row?.qty),
        price: toNumber(row?.price),
        reason: normalizeText(row?.reason),
        restock: row?.restock === false ? false : true,
        itemType: normalizeText(row?.itemType || 'general') || 'general'
      };
    })
    .filter((item) => item.item && item.productId && item.qty > 0);

  if (sanitized.length === 0) {
    throw new ApiError(400, 'Add at least one damaged item', 'DAMAGE_ITEMS_REQUIRED');
  }

  return sanitized;
};

const buildRecordMetadata = (body: Record<string, unknown>, items: SanitizedDamageItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + toNumber(item.qty) * toNumber(item.price), 0);
  const vatEnabled = Boolean(body?.vatEnabled);
  const tax = vatEnabled ? subtotal * 0.18 : 0;
  const restockPercent = normalizeText(body?.restockPercent || '0') || '0';
  const restockFee = subtotal * (toNumber(restockPercent) / 100);
  const shippingReverse = 0;
  const lossTotal = toNumber(body?.lossTotal || subtotal + tax - restockFee - shippingReverse);

  return {
    rmaNumber: normalizeText(body?.rmaNumber) || formatDamageNumber(DAMAGE_NUMBER_START),
    rmaDate: asDateString(body?.rmaDate),
    windowDays: normalizeText(body?.windowDays || '30') || '30',
    reportedBy: normalizeText(body?.reportedBy || body?.name),
    phone: normalizeText(body?.phone),
    notes: normalizeText(body?.notes),
    vatEnabled,
    restockPercent,
    subtotal,
    tax,
    restockFee,
    shippingReverse,
    lossTotal
  };
};

const restoreDamageStock = async (tx: Prisma.TransactionClient, businessId: string, referenceId: string) => {
  const previous = await tx.stockMovement.findMany({
    where: {
      businessId,
      movementType: DAMAGE_MOVEMENT_TYPE,
      referenceType: DAMAGE_REFERENCE_TYPE,
      referenceId
    }
  });

  for (const movement of previous) {
    const qtyToRestore = Math.abs(toNumber(movement.quantityDelta));
    if (!(qtyToRestore > 0)) continue;
    const result = await tx.product.updateMany({
      where: {
        id: movement.productId,
        businessId
      },
      data: {
        stockQuantity: {
          increment: qtyToRestore
        }
      }
    });
    if (result.count === 0) {
      throw new ApiError(404, 'Damaged stock product not found', 'DAMAGE_PRODUCT_NOT_FOUND');
    }
  }

  await tx.stockMovement.deleteMany({
    where: {
      businessId,
      movementType: DAMAGE_MOVEMENT_TYPE,
      referenceType: DAMAGE_REFERENCE_TYPE,
      referenceId
    }
  });
};

damagedStocksRouter.get(
  '/',
  requirePermission('inventory.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const movements = await listDamageMovements(String(req.auth?.businessId));
    res.json({ success: true, data: { records: buildDamageRecords(movements) } });
  })
);

damagedStocksRouter.post(
  '/',
  requirePermission('inventory.adjust'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const items = sanitizeDamageItems(req.body?.items);
    const recordId = randomUUID();
    const record = buildRecordMetadata(req.body || {}, items);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of items) {
        await applyStockAdjustment({
          tx,
          businessId,
          productId: item.productId,
          userId,
          movementType: DAMAGE_MOVEMENT_TYPE,
          quantityDelta: -Math.abs(toNumber(item.qty)),
          referenceType: DAMAGE_REFERENCE_TYPE,
          referenceId: recordId,
          unitPrice: toNumber(item.price),
          notes: item.reason || 'Damaged stock',
          metadata: {
            record,
            item
          }
        });
      }
    });

    const createdMovements = await listDamageMovements(businessId, recordId);
    const createdRecord = buildDamageRecords(createdMovements)[0] || null;

    await recordActivity({
      businessId,
      userId,
      action: 'damage_stock_create',
      title: 'Damaged stock recorded',
      details: `${record.rmaNumber} recorded`,
      entityType: 'DamageStock',
      entityId: recordId
    });

    res.status(201).json({ success: true, message: 'Damaged stock recorded successfully', data: { record: createdRecord } });
  })
);

damagedStocksRouter.patch(
  '/:recordId',
  requirePermission('inventory.adjust'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const recordId = normalizeText(req.params.recordId);
    const existing = await listDamageMovements(businessId, recordId);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Damage record not found', code: 'DAMAGE_RECORD_NOT_FOUND' });
    }

    const items = sanitizeDamageItems(req.body?.items);
    const record = buildRecordMetadata(req.body || {}, items);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await restoreDamageStock(tx, businessId, recordId);
      for (const item of items) {
        await applyStockAdjustment({
          tx,
          businessId,
          productId: item.productId,
          userId,
          movementType: DAMAGE_MOVEMENT_TYPE,
          quantityDelta: -Math.abs(toNumber(item.qty)),
          referenceType: DAMAGE_REFERENCE_TYPE,
          referenceId: recordId,
          unitPrice: toNumber(item.price),
          notes: item.reason || 'Damaged stock',
          metadata: {
            record,
            item
          }
        });
      }
    });

    const updatedMovements = await listDamageMovements(businessId, recordId);
    const updatedRecord = buildDamageRecords(updatedMovements)[0] || null;

    await recordActivity({
      businessId,
      userId,
      action: 'damage_stock_update',
      title: 'Damaged stock updated',
      details: `${record.rmaNumber} updated`,
      entityType: 'DamageStock',
      entityId: recordId
    });

    res.json({ success: true, message: 'Damaged stock updated successfully', data: { record: updatedRecord } });
  })
);

damagedStocksRouter.delete(
  '/:recordId',
  requirePermission('inventory.adjust'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const recordId = normalizeText(req.params.recordId);
    const existing = await listDamageMovements(businessId, recordId);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Damage record not found', code: 'DAMAGE_RECORD_NOT_FOUND' });
    }

    const record = buildDamageRecords(existing)[0] || null;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await deleteMovementHistoryOnly(tx, businessId, DAMAGE_MOVEMENT_TYPE, DAMAGE_REFERENCE_TYPE, recordId);
    });

    await recordActivity({
      businessId,
      userId,
      action: 'damage_stock_delete',
      title: 'Damaged stock deleted',
      details: `${normalizeText(record?.rmaNumber || recordId)} deleted`,
      entityType: 'DamageStock',
      entityId: recordId
    });

    res.json({ success: true, message: 'Damaged stock deleted successfully', data: { id: recordId } });
  })
);
