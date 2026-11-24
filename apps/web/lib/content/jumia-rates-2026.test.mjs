import assert from 'node:assert/strict';
import test from 'node:test';
import { JUMIA_RATES_2026, calculateMarketplaceComparison } from './jumia-rates-2026.ts';

test('GH₵ 2,500 mobile phone matches official 2026 Jumia 7% + Dropship/Express shipping', () => {
  const dropship = calculateMarketplaceComparison({
    categoryId: 'mobile-phones',
    price: 2500,
    fulfillment: 'dropship',
  });
  assert.equal(dropship.rate.commissionPct, 7);
  assert.equal(dropship.jumiaCommission, 175);
  assert.equal(dropship.jumiaShipping, 10);
  assert.equal(dropship.jumiaTotalFee, 185);
  assert.equal(dropship.jumiaNet, 2315);
  assert.equal(dropship.verndlyFee, 100);
  assert.equal(dropship.verndlyNet, 2400);
  assert.equal(dropship.diffPerOrder, 85);

  const express = calculateMarketplaceComparison({
    categoryId: 'mobile-phones',
    price: 2500,
    fulfillment: 'express',
  });
  assert.equal(express.jumiaShipping, 8);
  assert.equal(express.jumiaNet, 2317);
  assert.equal(express.diffPerOrder, 83);
});

test('GH₵ 200 fashion item matches official 2026 Jumia 20% + Dropship/Express shipping', () => {
  const dropship = calculateMarketplaceComparison({
    categoryId: 'fashion',
    price: 200,
    fulfillment: 'dropship',
  });
  assert.equal(dropship.rate.commissionPct, 20);
  assert.equal(dropship.jumiaCommission, 40);
  assert.equal(dropship.jumiaShipping, 8);
  assert.equal(dropship.jumiaNet, 152);
  assert.equal(dropship.verndlyFee, 8);
  assert.equal(dropship.verndlyNet, 192);
  assert.equal(dropship.diffPerOrder, 40);

  const express = calculateMarketplaceComparison({
    categoryId: 'fashion',
    price: 200,
    fulfillment: 'express',
  });
  assert.equal(express.jumiaShipping, 6);
  assert.equal(express.jumiaNet, 154);
  assert.equal(express.diffPerOrder, 38);
});

test('all 10 official 2026 categories are present with 7–20% commissions', () => {
  assert.equal(JUMIA_RATES_2026.length, 10);
  const commissions = JUMIA_RATES_2026.map((c) => c.commissionPct);
  assert.equal(Math.min(...commissions), 7);
  assert.equal(Math.max(...commissions), 20);
});
