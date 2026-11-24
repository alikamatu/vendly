import test from 'node:test';
import assert from 'node:assert/strict';
import { isShoeListing, resolveSizeFieldOptions, SHOE_SIZE_OPTIONS } from './shoe-sizing.ts';

test('T14 / PD-08: shoe categories and shoe titles offer EU/UK/US numeric sizes instead of S/M/L', () => {
  const clothingSizes = ['XS', 'S', 'M', 'L', 'XL'];

  assert.equal(isShoeListing('Shoes', ''), true);
  assert.equal(isShoeListing('Footwear', ''), true);
  assert.equal(isShoeListing('Fashion', 'Italian Leather Loafers Shoes'), true);
  assert.equal(isShoeListing('Fashion', 'Cotton Hoodie'), false);

  const shoeOpts = resolveSizeFieldOptions('Shoes', clothingSizes);
  assert.deepEqual(shoeOpts, [...SHOE_SIZE_OPTIONS]);
  assert.equal(shoeOpts.includes('S'), false);
  assert.equal(shoeOpts.includes('M'), false);
  assert.equal(shoeOpts.includes('L'), false);

  const fashionShoeOpts = resolveSizeFieldOptions('Fashion', clothingSizes, 'Italian shoes');
  assert.equal(fashionShoeOpts.includes('M'), false);
  assert.equal(fashionShoeOpts[0].startsWith('EU '), true);

  const hoodieOpts = resolveSizeFieldOptions('Fashion', clothingSizes, 'Chill Hoodie');
  assert.deepEqual(hoodieOpts, clothingSizes);
});
