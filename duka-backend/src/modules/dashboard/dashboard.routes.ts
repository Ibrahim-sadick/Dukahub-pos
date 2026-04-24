import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import { loadDamageLossSummary } from '../../shared/damaged-stock';
import type { AuthenticatedRequest } from '../../shared/types';
import { endOfDay, startOfDay } from '../../shared/utils';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requirePermission('dashboard.view'));

dashboardRouter.get(
  '/summary',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const now = new Date();
    const from = req.query.from ? startOfDay(String(req.query.from)) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = req.query.to ? endOfDay(String(req.query.to)) : endOfDay(now);

    const [productCount, lowStockCount, saleAgg, purchaseAgg, expenseAgg, damageLossSummary, salesCount, purchasesCount, expensesCount] = await Promise.all([
      prisma.product.count({ where: { businessId, status: 'ACTIVE' } }),
      prisma.product.count({ where: { businessId, status: 'ACTIVE', stockQuantity: { lte: 10 } } }),
      prisma.sale.aggregate({ where: { businessId, saleDate: { gte: from, lte: to } }, _sum: { finalTotal: true } }),
      prisma.purchase.aggregate({ where: { businessId, purchaseDate: { gte: from, lte: to } }, _sum: { total: true } }),
      prisma.expense.aggregate({ where: { businessId, expenseDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      loadDamageLossSummary(businessId, from, to),
      prisma.sale.count({ where: { businessId, saleDate: { gte: from, lte: to } } }),
      prisma.purchase.count({ where: { businessId, purchaseDate: { gte: from, lte: to } } }),
      prisma.expense.count({ where: { businessId, expenseDate: { gte: from, lte: to } } })
    ]);

    const totalSales = Number(saleAgg._sum.finalTotal || 0);
    const totalPurchases = Number(purchaseAgg._sum.total || 0);
    const totalExpenses = Number(expenseAgg._sum.amount || 0);
    const totalLosses = Number(damageLossSummary?.totalLosses || 0);

    res.json({
      success: true,
      data: {
        totals: {
          sales: totalSales,
          purchases: totalPurchases,
          expenses: totalExpenses,
          losses: totalLosses,
          profit: totalSales - totalPurchases - totalExpenses - totalLosses
        },
        counts: {
          products: productCount,
          lowStock: lowStockCount,
          sales: salesCount,
          purchases: purchasesCount,
          expenses: expensesCount,
          damagedStocks: Number(damageLossSummary?.recordsCount || 0)
        },
        range: {
          from: from.toISOString(),
          to: to.toISOString()
        }
      }
    });
  })
);
