import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRailProducts, isPubliclyVisibleInStock } from './product-visibility.ts';

test('T09 / HM-03 / PD-04: homepage rails never include qty 0 or non-approved items', () => {
  const mockOutOfStockJacket = {
    id: 'c5537034-4bfd-4460-b1bc-c469ab1827bb',
    title: 'VEOUNDK Men Loose Zip Up Hooded Jacket',
    status: 'active',
    quantity_available: 0,
    price: '200',
    original_price: '425',
    is_featured: true,
  };

  const mockInStockDeal = {
    id: 'prod-in-stock-deal',
    title: 'Handcrafted Leather Sandals',
    status: 'active',
    quantity_available: 4,
    price: '150',
    original_price: '220',
    is_featured: true,
  };

  const mockRejectedInStock = {
    id: 'prod-rejected',
    title: 'Sobolo',
    status: 'rejected',
    quantity_available: 10,
    price: '25',
    original_price: '40',
    is_featured: true,
  };

  assert.equal(isPubliclyVisibleInStock(mockOutOfStockJacket), false);
  assert.equal(isPubliclyVisibleInStock(mockRejectedInStock), false);
  assert.equal(isPubliclyVisibleInStock(mockInStockDeal), true);

  const rail = filterRailProducts([mockOutOfStockJacket, mockInStockDeal, mockRejectedInStock]);
  assert.deepEqual(
    rail.map((p) => p.id),
    ['prod-in-stock-deal'],
  );
});
