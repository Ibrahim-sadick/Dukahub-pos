import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';
import { recordActivity } from '../../shared/activity-log';
import { assertEntityOwnership } from '../../shared/documents';
import { endOfDay, startOfDay } from '../../shared/utils';

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get(
  '/',
  requirePermission('expenses.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const expenses = await prisma.expense.findMany({
      where: { businessId: String(req.auth?.businessId) },
      include: { createdBy: true, updatedBy: true },
      orderBy: { expenseDate: 'desc' }
    });

    res.json({ success: true, data: { expenses } });
  })
);

expensesRouter.post(
  '/',
  requirePermission('expenses.create'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const expense = await prisma.expense.create({
      data: {
        businessId: String(req.auth?.businessId),
        createdById: String(req.auth?.userId || ''),
        updatedById: String(req.auth?.userId || ''),
        title: req.body.title,
        category: req.body.category,
        vendor: req.body.vendor || null,
        paymentMethod: req.body.paymentMethod || 'Cash',
        status: req.body.status || 'Approved',
        amount: Number(req.body.amount || 0),
        expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : new Date(),
        notes: req.body.notes || null,
        metadata: req.body.metadata || undefined
      }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'expense_create',
      title: 'Expense created',
      details: `${expense.title} created`,
      entityType: 'Expense',
      entityId: expense.id
    });

    res.status(201).json({ success: true, message: 'Expense created successfully', data: { expense } });
  })
);

expensesRouter.patch(
  '/:expenseId',
  requirePermission('expenses.edit'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const existingExpense = await prisma.expense.findUnique({
      where: { id: String(req.params.expenseId) }
    });

    if (!existingExpense) {
      return res.status(404).json({ success: false, message: 'Expense not found', code: 'EXPENSE_NOT_FOUND' });
    }

    assertEntityOwnership(existingExpense.businessId, String(req.auth?.businessId));

    const expense = await prisma.expense.update({
      where: { id: String(req.params.expenseId) },
      data: {
        updatedById: String(req.auth?.userId || ''),
        title: req.body.title,
        category: req.body.category,
        vendor: req.body.vendor,
        paymentMethod: req.body.paymentMethod,
        status: req.body.status,
        amount: req.body.amount,
        expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : undefined,
        notes: req.body.notes,
        metadata: req.body.metadata
      }
    });

    await recordActivity({
      businessId: String(req.auth?.businessId),
      userId: String(req.auth?.userId || ''),
      action: 'expense_update',
      title: 'Expense updated',
      details: `${expense.title} updated`,
      entityType: 'Expense',
      entityId: expense.id
    });

    res.json({ success: true, message: 'Expense updated successfully', data: { expense } });
  })
);

expensesRouter.delete(
  '/:expenseId',
  requirePermission('expenses.delete'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const businessId = String(req.auth?.businessId);
    const userId = String(req.auth?.userId || '');
    const expenseId = String(req.params.expenseId || '');
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found', code: 'EXPENSE_NOT_FOUND' });
    }

    assertEntityOwnership(expense.businessId, businessId);

    await prisma.expense.delete({
      where: { id: expenseId }
    });

    await recordActivity({
      businessId,
      userId,
      action: 'expense_delete',
      title: 'Expense deleted',
      details: `${expense.title} deleted`,
      entityType: 'Expense',
      entityId: expense.id
    });

    res.json({ success: true, message: 'Expense deleted successfully', data: { id: expenseId } });
  })
);

expensesRouter.get(
  '/summary',
  requirePermission('expenses.view'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const from = req.query.from ? startOfDay(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? endOfDay(String(req.query.to)) : endOfDay(new Date());

    const [aggregate, grouped] = await Promise.all([
      prisma.expense.aggregate({
        where: { businessId: String(req.auth?.businessId), expenseDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { _all: true }
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { businessId: String(req.auth?.businessId), expenseDate: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { _all: true }
      })
    ]);

    res.json({ success: true, data: { aggregate, grouped, range: { from, to } } });
  })
);
