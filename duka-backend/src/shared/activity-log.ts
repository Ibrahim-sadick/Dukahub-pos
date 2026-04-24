import { Prisma, type ActivityStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface ActivityInput {
  businessId: string;
  userId?: string | null;
  action: string;
  title: string;
  details?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status?: ActivityStatus;
  metadata?: Prisma.InputJsonValue;
}

export const recordActivity = async (input: ActivityInput) => {
  await prisma.activityLog.create({
    data: {
      businessId: input.businessId,
      userId: input.userId ?? null,
      action: input.action,
      title: input.title,
      details: input.details ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      status: input.status ?? 'SUCCESS',
      metadata: input.metadata
    }
  });
};
