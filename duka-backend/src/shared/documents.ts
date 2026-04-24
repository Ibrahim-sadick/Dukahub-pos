import type { Prisma } from '@prisma/client';
import { ApiError } from './errors';

export const getNextDocumentNumber = async (
  tx: Prisma.TransactionClient,
  businessId: string,
  key: string,
  fallbackPrefix: string,
  fallbackPadding = 4
) => {
  const counter = await tx.documentCounter.upsert({
    where: { businessId_key: { businessId, key } },
    update: { nextValue: { increment: 1 } },
    create: {
      businessId,
      key,
      prefix: fallbackPrefix,
      nextValue: 2,
      padding: fallbackPadding
    }
  });

  const value = counter.nextValue - 1;
  const prefix = counter.prefix || fallbackPrefix;
  return `${prefix}${String(value).padStart(counter.padding, '0')}`;
};

export const assertEntityOwnership = (entityBusinessId: string, authBusinessId: string) => {
  if (entityBusinessId !== authBusinessId) {
    throw new ApiError(404, 'Record not found', 'RECORD_NOT_FOUND');
  }
};
