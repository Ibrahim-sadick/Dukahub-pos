import { prisma } from '../config/prisma';

export async function listPlans() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { pricePerMonth: 'asc' }
  });
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    pricePerMonth: p.pricePerMonth,
    months: p.months,
    durationDays: p.durationDays ?? 30,
    discountPercent: p.discountPercent,
    userLimit: p.userLimit,
    maxUsers: p.userLimit,
    trialDays: p.trialDays,
    features: Array.isArray(p.featuresJson) ? p.featuresJson : p.featuresJson ? p.featuresJson : null
  }));
}
