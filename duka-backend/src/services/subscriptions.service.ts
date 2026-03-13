import { prisma } from '../config/prisma';
import { HttpError } from '../utils/httpError';
import { normalizeTzPhone } from '../utils/phone';

type SubscriptionStatus = 'PAID' | 'TRIAL' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
const SubscriptionStatus = {
  PAID: 'PAID',
  TRIAL: 'TRIAL',
  PENDING: 'PENDING',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const satisfies Record<SubscriptionStatus, SubscriptionStatus>;

const SUBSCRIPTION_DURATION_DAYS = 30;

const toSubStatus = (status?: string): SubscriptionStatus => {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'paid') return SubscriptionStatus.PAID;
  if (s === 'trial') return SubscriptionStatus.TRIAL;
  if (s === 'expired') return SubscriptionStatus.EXPIRED;
  if (s === 'cancelled') return SubscriptionStatus.CANCELLED;
  return SubscriptionStatus.PENDING;
};

export async function getCurrentSubscription(businessId: number) {
  const sub = await prisma.subscription.findFirst({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: { plan: true }
  });
  if (!sub) return null;

  const now = Date.now();
  const endsAt = sub.endsAt.getTime();
  const status = endsAt && now > endsAt ? SubscriptionStatus.EXPIRED : sub.status;

  return {
    id: sub.id,
    status: String(status).toLowerCase(),
    startedAt: sub.startedAt.toISOString(),
    endsAt: sub.endsAt.toISOString(),
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
    months: sub.months,
    durationDays: sub.durationDays ?? sub.plan.durationDays ?? 30,
    discountPercent: sub.discountPercent,
    userLimit: sub.userLimit,
    maxUsers: sub.userLimit,
    amountPaid: sub.amountPaid,
    paymentPhone: sub.paymentPhone,
    paymentProvider: sub.paymentProvider,
    plan: {
      id: sub.plan.id,
      name: sub.plan.name,
      pricePerMonth: sub.plan.pricePerMonth,
      price: sub.plan.price,
      durationDays: sub.plan.durationDays ?? 30,
      maxUsers: sub.userLimit
    }
  };
}

export async function selectPlan(businessId: number, input: any) {
  const plan = await prisma.plan.findFirst({ where: { name: String(input.planName || '').trim(), isActive: true } });
  if (!plan) throw new HttpError(400, 'INVALID_PLAN', 'Invalid plan');

  const months = 1;
  const discountPercent = 0;
  const startedAt = new Date();
  const trialEndsAt = input.trialEndsAt ? new Date(input.trialEndsAt) : null;
  const durationDays = SUBSCRIPTION_DURATION_DAYS;
  const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const status = toSubStatus(input.status ?? 'paid');

  const paymentPhone = input.paymentPhone ? normalizeTzPhone(input.paymentPhone) : null;
  const subscription = await prisma.subscription.create({
    data: {
      businessId,
      planId: plan.id,
      status,
      startedAt,
      endsAt,
      trialEndsAt,
      months,
      durationDays,
      discountPercent,
      userLimit: plan.userLimit,
      amountPaid: input.amountPaid ?? null,
      paymentProvider: input.paymentProvider || null,
      paymentPhone
    },
    include: { plan: true }
  });

  return {
    id: subscription.id,
    status: String(subscription.status).toLowerCase(),
    startedAt: subscription.startedAt.toISOString(),
    endsAt: subscription.endsAt.toISOString(),
    trialEndsAt: subscription.trialEndsAt ? subscription.trialEndsAt.toISOString() : null,
    months: subscription.months,
    durationDays: subscription.durationDays ?? durationDays,
    discountPercent: subscription.discountPercent,
    userLimit: subscription.userLimit,
    maxUsers: subscription.userLimit,
    amountPaid: subscription.amountPaid,
    paymentPhone: subscription.paymentPhone,
    paymentProvider: subscription.paymentProvider,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      pricePerMonth: subscription.plan.pricePerMonth,
      price: subscription.plan.price,
      durationDays: subscription.plan.durationDays ?? durationDays,
      maxUsers: subscription.userLimit
    }
  };
}

export async function confirmPayment(businessId: number, input: any) {
  const planName = String(input.planName || input.planId || '').trim();
  if (!planName) throw new HttpError(400, 'INVALID_PLAN', 'planName is required');

  const plan = await prisma.plan.findFirst({ where: { name: planName, isActive: true } });
  if (!plan) throw new HttpError(400, 'INVALID_PLAN', 'Invalid plan');

  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) throw new HttpError(400, 'INVALID_AMOUNT', 'Invalid amount');
  if (amount !== Number(plan.price)) throw new HttpError(400, 'INVALID_AMOUNT', `Amount must be ${Number(plan.price)} for plan ${plan.name}`);

  const reference = input.reference != null ? String(input.reference).trim() : '';
  if (amount > 0 && !reference) throw new HttpError(400, 'MISSING_REFERENCE', 'Payment reference is required');

  const months = 1;
  const discountPercent = 0;
  const durationDays = SUBSCRIPTION_DURATION_DAYS;
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const paymentPhone = input.phoneNumber ? normalizeTzPhone(input.phoneNumber) : null;

  const result = await prisma.$transaction(async (tx: any) => {
    if (reference) {
      const existingRef = await tx.payment.findFirst({ where: { reference } });
      if (existingRef && existingRef.businessId !== businessId) {
        throw new HttpError(409, 'REFERENCE_EXISTS', 'Payment reference already exists');
      }
    }

    const subscription = await tx.subscription.create({
      data: {
        businessId,
        planId: plan.id,
        status: SubscriptionStatus.PAID,
        startedAt,
        endsAt,
        trialEndsAt: null,
        months,
        durationDays,
        discountPercent,
        userLimit: plan.userLimit,
        amountPaid: amount,
        paymentProvider: input.provider || null,
        paymentPhone
      },
      include: { plan: true }
    });

    const payment = await tx.payment.create({
      data: {
        businessId,
        subscriptionId: subscription.id,
        reference: reference || null,
        phoneNumber: paymentPhone,
        amount: amount || 0,
        provider: input.provider || null,
        status: 'success',
        paidAt: startedAt
      }
    });

    return { subscription, payment };
  });

  const sub = result.subscription;
  return {
    id: sub.id,
    status: String(sub.status).toLowerCase(),
    startedAt: sub.startedAt.toISOString(),
    endsAt: sub.endsAt.toISOString(),
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
    months: sub.months,
    durationDays: sub.durationDays ?? durationDays,
    discountPercent: sub.discountPercent,
    userLimit: sub.userLimit,
    maxUsers: sub.userLimit,
    amountPaid: sub.amountPaid,
    paymentPhone: sub.paymentPhone,
    paymentProvider: sub.paymentProvider,
    plan: {
      id: sub.plan.id,
      name: sub.plan.name,
      pricePerMonth: sub.plan.pricePerMonth,
      price: sub.plan.price,
      durationDays: sub.plan.durationDays ?? durationDays,
      maxUsers: sub.userLimit
    },
    payment: {
      id: result.payment.id,
      reference: result.payment.reference,
      amount: result.payment.amount,
      provider: result.payment.provider,
      status: result.payment.status,
      paidAt: result.payment.paidAt ? result.payment.paidAt.toISOString() : null
    }
  };
}
