import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductSlug, getProductPath, isUuid } from './product-slug.ts';

test('T15 / PD-07: builds human-readable product slugs and disambiguates collisions', () => {
  const hoodie = {
    id: '240b8f0c-227c-414b-a6de-0a1b2c3d4e5f',
    title: 'Chill Hoodie',
    seller: { store_link: 'the-hoodies', store_name: 'The Hoodies' },
  };

  assert.equal(isUuid(hoodie.id), true);
  assert.equal(isUuid('chill-hoodie-the-hoodies'), false);
  assert.equal(buildProductSlug(hoodie), 'chill-hoodie-the-hoodies');
  assert.equal(getProductPath(hoodie), '/product/chill-hoodie-the-hoodies');
  assert.equal(buildProductSlug(hoodie, true), 'chill-hoodie-the-hoodies-240b8f');
});
