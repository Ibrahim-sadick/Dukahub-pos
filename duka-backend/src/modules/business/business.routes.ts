import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';
import { recordActivity } from '../../shared/activity-log';

export const businessRouter = Router();

businessRouter.use(requireAuth);

businessRouter.get(
  '/',
  requirePermission('settings.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const business = await prisma.business.findUnique({
      where: { id: String(req.auth?.businessId) },
      include: {
        owner: { select: { id: true, fullName: true, phone: true, email: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    });

    res.json({ success: true, data: { business } });
  })
);

businessRouter.patch(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const business = await prisma.business.update({
      where: { id: String(req.auth?.businessId) },
      data: {
        name: req.body.name,
        businessName: req.body.businessName,
        phone: req.body.phone,
        email: req.body.email,
        location: req.body.location,
        address: req.body.address,
        website: req.body.website,
        poBox: req.body.poBox,
        fax: req.body.fax,
        tin: req.body.tin,
        vrn: req.body.vrn,
        taxId: req.body.taxId,
        logo: req.body.logo,
        businessDescription: req.body.businessDescription,
        receiptFooterMessage: req.body.receiptFooterMessage,
        businessModule: req.body.businessModule
      }
    });

    await recordActivity({
      businessId: business.id,
      userId: String(req.auth?.userId || ''),
      action: 'business_update',
      title: 'Business profile updated',
      details: 'Business details were updated',
      entityType: 'Business',
      entityId: business.id
    });

    res.json({ success: true, message: 'Business updated successfully', data: { business } });
  })
);

businessRouter.patch(
  '/subscription',
  requirePermission('settings.manage'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionPlan: req.body.subscriptionPlan,
        subscriptionPaymentStatus: req.body.subscriptionPaymentStatus,
        subscriptionStartedAt: req.body.subscriptionStartedAt ? new Date(req.body.subscriptionStartedAt) : null,
        subscriptionEndsAt: req.body.subscriptionEndsAt ? new Date(req.body.subscriptionEndsAt) : null,
        subscriptionTrialEndsAt: req.body.subscriptionTrialEndsAt ? new Date(req.body.subscriptionTrialEndsAt) : null,
        subscriptionBillingCycle: req.body.subscriptionBillingCycle,
        subscriptionDurationDays: req.body.subscriptionDurationDays ?? 0,
        subscriptionMonths: req.body.subscriptionMonths ?? 0,
        subscriptionDiscountPercent: req.body.subscriptionDiscountPercent ?? 0,
        subscriptionRawMonthlyPrice: req.body.subscriptionRawMonthlyPrice ?? 0,
        subscriptionAmountPaid: req.body.subscriptionAmountPaid ?? 0,
        paymentProvider: req.body.paymentProvider || null,
        paymentPhone: req.body.paymentPhone || null,
        paymentReference: req.body.paymentReference || null
      }
    });

    if (req.body.subscriptionPlan) {
      await prisma.subscriptionRecord.create({
        data: {
          businessId,
          createdById: userId || null,
          planCode: String(req.body.subscriptionPlan),
          billingCycle: String(req.body.subscriptionBillingCycle || '1m'),
          amountPaid: Number(req.body.subscriptionAmountPaid || 0),
          rawMonthlyPrice: Number(req.body.subscriptionRawMonthlyPrice || 0),
          discountPercent: Number(req.body.subscriptionDiscountPercent || 0),
          paymentStatus: String(req.body.subscriptionPaymentStatus || 'paid'),
          paymentProvider: req.body.paymentProvider || null,
          paymentPhone: req.body.paymentPhone || null,
          paymentReference: req.body.paymentReference || null,
          startedAt: req.body.subscriptionStartedAt ? new Date(req.body.subscriptionStartedAt) : new Date(),
          endsAt: req.body.subscriptionEndsAt ? new Date(req.body.subscriptionEndsAt) : null,
          trialEndsAt: req.body.subscriptionTrialEndsAt ? new Date(req.body.subscriptionTrialEndsAt) : null,
          durationDays: Number(req.body.subscriptionDurationDays || 0),
          months: Number(req.body.subscriptionMonths || 0)
        }
      });
    }

    await recordActivity({
      businessId,
      userId,
      action: 'subscription_update',
      title: 'Subscription updated',
      details: `${String(req.body.subscriptionPlan || 'Plan').trim() || 'Plan'} subscription updated`,
      entityType: 'Business',
      entityId: businessId
    });

    res.json({ success: true, message: 'Subscription updated successfully', data: { business } });
  })
);
