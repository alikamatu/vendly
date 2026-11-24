import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_MARKETPLACE_RATES, calculateMarketplaceComparison } from './marketplace-rates.ts';

test('GH₵ 2,500 mobile phone compares Verndly 4% against 7% + Dropship/Fulfillment shipping', () => {
  const dropship = calculateMarketplaceComparison({
    categoryId: 'mobile-phones',
    price: 2500,
    fulfillment: 'dropship',
  });
  assert.equal(dropship.rate.commissionPct, 7);
  assert.equal(dropship.legacyCommission, 175);
  assert.equal(dropship.legacyShipping, 10);
  assert.equal(dropship.legacyTotalFee, 185);
  assert.equal(dropship.legacyNet, 2315);
  assert.equal(dropship.verndlyFee, 100);
  assert.equal(dropship.verndlyNet, 2400);
  assert.equal(dropship.diffPerOrder, 85);

  const express = calculateMarketplaceComparison({
    categoryId: 'mobile-phones',
    price: 2500,
    fulfillment: 'express',
  });
  assert.equal(express.legacyShipping, 8);
  assert.equal(express.legacyNet, 2317);
  assert.equal(express.diffPerOrder, 83);
});

test('GH₵ 200 fashion item compares Verndly 4% against 20% + Dropship/Fulfillment shipping', () => {
  const dropship = calculateMarketplaceComparison({
    categoryId: 'fashion',
    price: 200,
    fulfillment: 'dropship',
  });
  assert.equal(dropship.rate.commissionPct, 20);
  assert.equal(dropship.legacyCommission, 40);
  assert.equal(dropship.legacyShipping, 8);
  assert.equal(dropship.legacyNet, 152);
  assert.equal(dropship.verndlyFee, 8);
  assert.equal(dropship.verndlyNet, 192);
  assert.equal(dropship.diffPerOrder, 40);

  const express = calculateMarketplaceComparison({
    categoryId: 'fashion',
    price: 200,
    fulfillment: 'express',
  });
  assert.equal(express.legacyShipping, 6);
  assert.equal(express.legacyNet, 154);
  assert.equal(express.diffPerOrder, 38);
});

test('all 10 benchmark categories are present with 7–20% commissions', () => {
  assert.equal(LEGACY_MARKETPLACE_RATES.length, 10);
  const commissions = LEGACY_MARKETPLACE_RATES.map((c) => c.commissionPct);
  assert.equal(Math.min(...commissions), 7);
  assert.equal(Math.max(...commissions), 20);
});
