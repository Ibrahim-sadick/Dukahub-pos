import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';
import { defaultBusinessSettings, mergeSettings } from '../../constants/defaults';
import { recordActivity } from '../../shared/activity-log';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get(
  '/',
  requirePermission('settings.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const settings = await prisma.businessSetting.findUnique({
      where: { businessId: String(req.auth?.businessId) }
    });

    res.json({ success: true, data: { settings: mergeSettings(settings) } });
  })
);

settingsRouter.patch(
  '/',
  requirePermission('settings.manage'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const payload = {
      general: req.body.general ?? defaultBusinessSettings.general,
      sales: req.body.sales ?? defaultBusinessSettings.sales,
      inventory: req.body.inventory ?? defaultBusinessSettings.inventory,
      notifications: req.body.notifications ?? defaultBusinessSettings.notifications,
      localization: req.body.localization ?? defaultBusinessSettings.localization,
      appearance: req.body.appearance ?? defaultBusinessSettings.appearance,
      security: req.body.security ?? defaultBusinessSettings.security,
      profile: req.body.profile ?? defaultBusinessSettings.profile
    };

    const settings = await prisma.businessSetting.upsert({
      where: { businessId: String(req.auth?.businessId) },
      update: payload,
      create: {
        businessId: String(req.auth?.businessId),
        ...payload
      }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'settings_update',
      title: 'System settings updated',
      details: 'Business settings were updated',
      entityType: 'BusinessSetting',
      entityId: settings.id
    });

    res.json({ success: true, message: 'Settings updated successfully', data: { settings } });
  })
);
