import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma, StockMovementType } from '@prisma/client';
import { deleteMovementHistoryOnly, deleteSaleHistoryOnly, SALE_DELETE_REFERENCE_TYPES } from './history-delete';

const createTransactionMock = () => {
  let deleteArgs: unknown = null;
  let deleteCalls = 0;
  let productTouched = false;

  const tx = {
    stockMovement: {
      async deleteMany(args: unknown) {
        deleteCalls += 1;
        deleteArgs = args;
        return { count: 1 };
      }
    },
    product: {
      async updateMany() {
        productTouched = true;
        return { count: 0 };
      }
    }
  } as unknown as Prisma.TransactionClient;

  return {
    tx,
    getDeleteArgs: () => deleteArgs,
    getDeleteCalls: () => deleteCalls,
    wasProductTouched: () => productTouched
  };
};

test('deleteSaleHistoryOnly removes sale movement history without touching product stock', async () => {
  const mock = createTransactionMock();

  await deleteSaleHistoryOnly(mock.tx, 'business-1', 'sale-1');

  assert.equal(mock.getDeleteCalls(), 1);
  assert.deepEqual(mock.getDeleteArgs(), {
    where: {
      businessId: 'business-1',
      referenceId: 'sale-1',
      referenceType: {
        in: [...SALE_DELETE_REFERENCE_TYPES]
      }
    }
  });
  assert.equal(mock.wasProductTouched(), false);
});

test('deleteMovementHistoryOnly removes a scoped movement history without touching product stock', async () => {
  const mock = createTransactionMock();

  await deleteMovementHistoryOnly(mock.tx, 'business-2', 'DAMAGE_OUT' as StockMovementType, 'DamageStock', 'damage-1');

  assert.equal(mock.getDeleteCalls(), 1);
  assert.deepEqual(mock.getDeleteArgs(), {
    where: {
      businessId: 'business-2',
      movementType: 'DAMAGE_OUT',
      referenceType: 'DamageStock',
      referenceId: 'damage-1'
    }
  });
  assert.equal(mock.wasProductTouched(), false);
});
