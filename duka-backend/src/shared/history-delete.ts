import type { Prisma, StockMovementType } from '@prisma/client';

export const SALE_DELETE_REFERENCE_TYPES = ['Sale', 'SaleUpdate', 'SaleUpdateReversal', 'SaleDeletion'] as const;

export const deleteSaleHistoryOnly = async (tx: Prisma.TransactionClient, businessId: string, saleId: string) => {
  await tx.stockMovement.deleteMany({
    where: {
      businessId,
      referenceId: saleId,
      referenceType: {
        in: [...SALE_DELETE_REFERENCE_TYPES]
      }
    }
  });
};

export const deleteMovementHistoryOnly = async (
  tx: Prisma.TransactionClient,
  businessId: string,
  movementType: StockMovementType,
  referenceType: string,
  referenceId: string
) => {
  await tx.stockMovement.deleteMany({
    where: {
      businessId,
      movementType,
      referenceType,
      referenceId
    }
  });
};
