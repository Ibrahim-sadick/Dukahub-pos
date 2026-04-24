import { prisma } from '../lib/prisma';

export const DAMAGE_REFERENCE_TYPE = 'DamageStock';
export const DAMAGE_MOVEMENT_TYPE = 'LOSS_OUT';

const normalizeText = (value: unknown) => String(value || '').trim();

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseMetadataObject = (value: unknown) => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
};

const getMovementRecordLoss = (movement: {
  metadata?: unknown;
  quantityDelta?: unknown;
  unitPrice?: unknown;
  unitCost?: unknown;
}) => {
  const metadata = parseMetadataObject(movement?.metadata);
  const recordMeta = parseMetadataObject(metadata?.record);
  const itemMeta = parseMetadataObject(metadata?.item);
  const recordLoss = toNumber(recordMeta?.lossTotal);
  if (recordLoss > 0) return recordLoss;
  const qty = Math.abs(toNumber(movement?.quantityDelta));
  const unitValue = toNumber(itemMeta?.price ?? movement?.unitPrice ?? movement?.unitCost);
  return qty * unitValue;
};

export const summarizeDamageLossesFromMovements = (
  movements: Array<{
    referenceId?: string | null;
    metadata?: unknown;
    quantityDelta?: unknown;
    unitPrice?: unknown;
    unitCost?: unknown;
  }>
) => {
  const grouped = new Map<string, number>();

  (Array.isArray(movements) ? movements : []).forEach((movement) => {
    const referenceId = normalizeText(movement?.referenceId);
    if (!referenceId || grouped.has(referenceId)) return;
    grouped.set(referenceId, getMovementRecordLoss(movement));
  });

  return {
    recordsCount: grouped.size,
    totalLosses: Array.from(grouped.values()).reduce((sum, value) => sum + toNumber(value), 0)
  };
};

export const loadDamageLossSummary = async (businessId: string, from: Date, to: Date) => {
  const movements = await prisma.stockMovement.findMany({
    where: {
      businessId,
      movementType: DAMAGE_MOVEMENT_TYPE,
      referenceType: DAMAGE_REFERENCE_TYPE,
      createdAt: { gte: from, lte: to }
    },
    select: {
      referenceId: true,
      metadata: true,
      quantityDelta: true,
      unitPrice: true,
      unitCost: true
    }
  });

  return summarizeDamageLossesFromMovements(movements);
};
