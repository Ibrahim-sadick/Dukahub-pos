import { Prisma, type StockMovementType } from '@prisma/client';
import { ApiError } from './errors';

interface StockAdjustmentInput {
  tx: Prisma.TransactionClient;
  businessId: string;
  productId: string;
  userId?: string;
  movementType: StockMovementType;
  quantityDelta: number;
  referenceType: string;
  referenceId: string;
  unitCost?: number | null;
  unitPrice?: number | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export const applyStockAdjustment = async (input: StockAdjustmentInput) => {
  const product = await input.tx.product.findUnique({ where: { id: input.productId } });
  if (!product || product.businessId !== input.businessId) {
    throw new ApiError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }

  const currentStock = Number(product.stockQuantity);
  const nextStock = currentStock + input.quantityDelta;
  if (nextStock < 0 && !product.allowNegativeStock) {
    throw new ApiError(400, `Insufficient stock for ${product.name}`, 'INSUFFICIENT_STOCK');
  }

  await input.tx.product.update({
    where: { id: product.id },
    data: { stockQuantity: nextStock }
  });

  await input.tx.stockMovement.create({
    data: {
      businessId: input.businessId,
      productId: product.id,
      userId: input.userId || null,
      movementType: input.movementType,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      quantityDelta: input.quantityDelta,
      unit: product.unit,
      unitCost: input.unitCost ?? null,
      unitPrice: input.unitPrice ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata
    }
  });
};
