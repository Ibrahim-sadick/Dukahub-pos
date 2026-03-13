import { prisma } from '../config/prisma';

export async function getBusinessMe(businessId: number) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      workspaces: { orderBy: [{ isMain: 'desc' }, { id: 'asc' }] },
      modules: { include: { module: true } }
    }
  });
  if (!business) return null;

  return {
    id: business.id,
    businessName: business.businessName,
    phone: business.phone,
    email: business.email,
    address: business.address,
    currency: business.currency,
    timezone: business.timezone,
    workspaces: business.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      location: w.location,
      isMain: w.isMain
    })),
    modules: business.modules.map((m) => ({
      key: m.module.key,
      name: m.module.name,
      enabled: m.enabled
    }))
  };
}

