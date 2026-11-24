import test from 'node:test';
import assert from 'node:assert/strict';
import { getServiceAreaLabel, isProductTrending } from './product-badges.ts';

test('T12 / PD-06: 0-view and 0-review products never show Trending Now', () => {
  assert.equal(
    isProductTrending({ views_count: 0, rating_count: 0, quantity_available: 5 }),
    false,
  );
  assert.equal(
    isProductTrending({ views_count: 25, rating_count: 0, quantity_available: 5 }),
    false,
  );
  assert.equal(isProductTrending({ views_7d: 100, quantity_available: 0 }), false);
  assert.equal(isProductTrending({ views_7d: 50, quantity_available: 3 }), true);
  assert.equal(isProductTrending({ orders_7d: 5, quantity_available: 3 }), true);
  assert.equal(
    isProductTrending({ views_count: 120, rating_count: 3, quantity_available: 2 }),
    true,
  );
});

test('T12 / PD-06: service area labels avoid "Nearby states" and overclaiming "Nationwide"', () => {
  assert.equal(getServiceAreaLabel('SAME_CITY'), 'Same city only');
  assert.equal(getServiceAreaLabel('NEARBY_STATES'), 'Nearby areas');
  assert.equal(getServiceAreaLabel('NATIONWIDE'), 'Delivery set by seller');
});
