import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import { DAMAGE_MOVEMENT_TYPE, DAMAGE_REFERENCE_TYPE, loadDamageLossSummary } from '../../shared/damaged-stock';
import type { AuthenticatedRequest } from '../../shared/types';
import { endOfDay, startOfDay } from '../../shared/utils';

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requirePermission('reports.view'));

const toNumber = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value: unknown) => String(value || '').trim();

const parseMetadataObject = (value: unknown) => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
};

const getDamageLossAmount = (movement: {
  metadata?: unknown;
  quantityDelta?: unknown;
  unitPrice?: unknown;
  unitCost?: unknown;
}) => {
  const metadata = parseMetadataObject(movement?.metadata);
  const recordMeta = parseMetadataObject(metadata?.record);
  const itemMeta = parseMetadataObject(metadata?.item);
  const recordLoss = toNumber(recordMeta?.lossTotal);
  if (recordLoss > 0) return recordLoss;
  const qty = Math.abs(toNumber(movement?.quantityDelta));
  const unitValue = toNumber(itemMeta?.price ?? movement?.unitPrice ?? movement?.unitCost);
  return qty * unitValue;
};

const formatMonthKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const buildProfitLossTrendMonths = (anchor: Date) => {
  const months: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  for (let index = 11; index >= 0; index -= 1) {
    const start = new Date(anchor.getFullYear(), anchor.getMonth() - index, 1);
    const end = endOfDay(new Date(start.getFullYear(), start.getMonth() + 1, 0));
    months.push({
      key: formatMonthKey(start),
      label: start.toLocaleString('en-US', { month: 'short' }),
      start,
      end
    });
  }
  return months;
};

reportsRouter.get(
  '/sales',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const from = req.query.from ? startOfDay(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? endOfDay(String(req.query.to)) : endOfDay(new Date());

    const [aggregate, byPaymentMethod, topProducts] = await Promise.all([
      prisma.sale.aggregate({
        where: { businessId: String(req.auth?.businessId), saleDate: { gte: from, lte: to } },
        _sum: { finalTotal: true, amountPaid: true, balanceDue: true, discount: true },
        _count: { _all: true }
      }),
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: { businessId: String(req.auth?.businessId), saleDate: { gte: from, lte: to } },
        _sum: { finalTotal: true },
        _count: { _all: true }
      }),
      prisma.saleItem.groupBy({
        by: ['productName'],
        where: { sale: { businessId: String(req.auth?.businessId), saleDate: { gte: from, lte: to } } },
        _sum: { qty: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10
      })
    ]);

    res.json({ success: true, data: { aggregate, byPaymentMethod, topProducts, range: { from, to } } });
  })
);

reportsRouter.get(
  '/purchases',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const from = req.query.from ? startOfDay(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? endOfDay(String(req.query.to)) : endOfDay(new Date());

    const [aggregate, byStatus, bySupplier] = await Promise.all([
      prisma.purchase.aggregate({
        where: { businessId: String(req.auth?.businessId), purchaseDate: { gte: from, lte: to } },
        _sum: { total: true, amountPaid: true, balanceDue: true, discount: true },
        _count: { _all: true }
      }),
      prisma.purchase.groupBy({
        by: ['status'],
        where: { businessId: String(req.auth?.businessId), purchaseDate: { gte: from, lte: to } },
        _sum: { total: true },
        _count: { _all: true }
      }),
      prisma.purchase.groupBy({
        by: ['supplierName'],
        where: { businessId: String(req.auth?.businessId), purchaseDate: { gte: from, lte: to } },
        _sum: { total: true },
        _count: { _all: true }
      })
    ]);

    res.json({ success: true, data: { aggregate, byStatus, bySupplier, range: { from, to } } });
  })
);

reportsRouter.get(
  '/profit-loss',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const now = new Date();
    const from = req.query.from ? startOfDay(String(req.query.from)) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = req.query.to ? endOfDay(String(req.query.to)) : endOfDay(now);
    const businessId = String(req.auth?.businessId);
    const trendMonths = buildProfitLossTrendMonths(to);
    const trendFrom = trendMonths[0]?.start || from;
    const trendTo = trendMonths[trendMonths.length - 1]?.end || to;

    const [sales, purchases, expenses, damageLossSummary, expenseCategoriesRaw, trendSales, trendExpenses, lossMovements, recentSales, recentExpenses] = await Promise.all([
      prisma.sale.aggregate({
        where: { businessId, saleDate: { gte: from, lte: to } },
        _sum: { finalTotal: true }
      }),
      prisma.purchase.aggregate({
        where: { businessId, purchaseDate: { gte: from, lte: to } },
        _sum: { total: true }
      }),
      prisma.expense.aggregate({
        where: { businessId, expenseDate: { gte: from, lte: to } },
        _sum: { amount: true }
      }),
      loadDamageLossSummary(businessId, from, to),
      prisma.expense.groupBy({
        by: ['category'],
        where: { businessId, expenseDate: { gte: from, lte: to } },
        _sum: { amount: true }
      }),
      prisma.sale.findMany({
        where: { businessId, saleDate: { gte: trendFrom, lte: trendTo } },
        select: { saleDate: true, finalTotal: true }
      }),
      prisma.expense.findMany({
        where: { businessId, expenseDate: { gte: trendFrom, lte: trendTo } },
        select: { expenseDate: true, amount: true }
      }),
      prisma.stockMovement.findMany({
        where: {
          businessId,
          movementType: DAMAGE_MOVEMENT_TYPE,
          referenceType: DAMAGE_REFERENCE_TYPE,
          createdAt: { gte: trendFrom, lte: trendTo }
        },
        select: {
          referenceId: true,
          createdAt: true,
          metadata: true,
          quantityDelta: true,
          unitPrice: true,
          unitCost: true,
          notes: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.sale.findMany({
        where: { businessId, saleDate: { gte: from, lte: to } },
        select: {
          id: true,
          saleNumber: true,
          saleDate: true,
          finalTotal: true
        },
        orderBy: { saleDate: 'desc' },
        take: 10
      }),
      prisma.expense.findMany({
        where: { businessId, expenseDate: { gte: from, lte: to } },
        select: {
          id: true,
          title: true,
          category: true,
          expenseDate: true,
          amount: true
        },
        orderBy: { expenseDate: 'desc' },
        take: 10
      })
    ]);

    const totalSales = Number(sales._sum.finalTotal || 0);
    const totalPurchases = Number(purchases._sum.total || 0);
    const totalExpenses = Number(expenses._sum.amount || 0);
    const totalLosses = Number(damageLossSummary?.totalLosses || 0);
    const lossesByReference = new Map<
      string,
      {
        key: string;
        date: string;
        ref: string;
        category: string;
        amount: number;
        sortDate: string;
      }
    >();

    lossMovements.forEach((movement) => {
      const referenceId = normalizeText(movement.referenceId) || `loss-${movement.createdAt.toISOString()}`;
      if (lossesByReference.has(referenceId)) return;
      const metadata = parseMetadataObject(movement.metadata);
      const recordMeta = parseMetadataObject(metadata?.record);
      const itemMeta = parseMetadataObject(metadata?.item);
      lossesByReference.set(referenceId, {
        key: `loss-${referenceId}`,
        date: movement.createdAt.toISOString(),
        ref: normalizeText(recordMeta?.rmaNumber) || referenceId,
        category: normalizeText(itemMeta?.reason || movement.notes) || 'Stock Loss',
        amount: -getDamageLossAmount(movement),
        sortDate: movement.createdAt.toISOString()
      });
    });

    const trendRevenue = new Map(trendMonths.map((month) => [month.key, 0]));
    const trendExpenseTotals = new Map(trendMonths.map((month) => [month.key, 0]));

    trendSales.forEach((entry) => {
      const key = formatMonthKey(entry.saleDate);
      if (!trendRevenue.has(key)) return;
      trendRevenue.set(key, (trendRevenue.get(key) || 0) + toNumber(entry.finalTotal));
    });

    trendExpenses.forEach((entry) => {
      const key = formatMonthKey(entry.expenseDate);
      if (!trendExpenseTotals.has(key)) return;
      trendExpenseTotals.set(key, (trendExpenseTotals.get(key) || 0) + toNumber(entry.amount));
    });

    lossesByReference.forEach((entry) => {
      const key = formatMonthKey(new Date(entry.date));
      if (!trendExpenseTotals.has(key)) return;
      trendExpenseTotals.set(key, (trendExpenseTotals.get(key) || 0) + Math.abs(toNumber(entry.amount)));
    });

    const trend = {
      groups: trendMonths.map((month) => {
        const revenue = trendRevenue.get(month.key) || 0;
        const totalMonthExpenses = trendExpenseTotals.get(month.key) || 0;
        return {
          key: month.key,
          label: month.label,
          revenue,
          expenses: totalMonthExpenses,
          profit: revenue - totalMonthExpenses
        };
      })
    };

    const expenseCategories = expenseCategoriesRaw
      .map((entry) => ({
        label: normalizeText(entry.category) || 'Other',
        value: toNumber(entry._sum.amount)
      }))
      .filter((entry) => entry.value > 0);

    if (totalLosses > 0) {
      expenseCategories.push({ label: 'Stock Losses', value: totalLosses });
    }

    expenseCategories.sort((left, right) => right.value - left.value);

    const recentActivity = [
      ...recentSales.map((sale) => ({
        key: `sale-${sale.id}`,
        date: sale.saleDate.toISOString(),
        type: 'Sale',
        ref: normalizeText(sale.saleNumber) || sale.id,
        category: 'Sales',
        amount: toNumber(sale.finalTotal),
        sortDate: sale.saleDate.toISOString()
      })),
      ...recentExpenses.map((expense) => ({
        key: `expense-${expense.id}`,
        date: expense.expenseDate.toISOString(),
        type: 'Expense',
        ref: expense.id,
        category: normalizeText(expense.category || expense.title) || 'Expense',
        amount: -toNumber(expense.amount),
        sortDate: expense.expenseDate.toISOString()
      })),
      ...Array.from(lossesByReference.values())
    ]
      .sort((left, right) => right.sortDate.localeCompare(left.sortDate))
      .slice(0, 10)
      .map(({ sortDate, ...entry }) => entry);

    res.json({
      success: true,
      data: {
        revenue: totalSales,
        costOfGoods: totalPurchases,
        operatingExpenses: totalExpenses,
        stockLosses: totalLosses,
        grossProfit: totalSales - totalPurchases,
        netProfit: totalSales - totalPurchases - totalExpenses - totalLosses,
        range: { from, to },
        trend,
        expenseCategories,
        recentActivity
      }
    });
  })
);
