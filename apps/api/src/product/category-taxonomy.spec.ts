import {
  getSubcategoriesForCategory,
  matchSubcategoryName,
  normalizeProductAttributes,
} from './category-taxonomy';
import { ProductService } from './product.service';

describe('Category subcategory taxonomy & structured attributes', () => {
  it('returns shopping subtabs for core categories', () => {
    const elec = getSubcategoriesForCategory('Electronics').map((s) => s.name);
    expect(elec).toEqual(
      expect.arrayContaining(['Phones', 'Laptops', 'Tablets', 'Smartwatches']),
    );

    const fashion = getSubcategoriesForCategory('Fashion').map((s) => s.name);
    expect(fashion).toEqual(
      expect.arrayContaining(["Women's Dresses", 'Shoes', 'Bags & Handbags']),
    );

    const jewelry = getSubcategoriesForCategory('Jewelry & Watches').map(
      (s) => s.name,
    );
    expect(jewelry).toEqual(expect.arrayContaining(['Watches', 'Rings']));
  });

  it('infers accurate subcategories from titles and tags', () => {
    expect(
      matchSubcategoryName(undefined, 'Electronics', {
        title: 'iPhone 15 Pro Max 256GB Titanium',
      }),
    ).toBe('Phones');

    expect(
      matchSubcategoryName(undefined, 'Electronics', {
        title: 'HP EliteBook 840 G8 Core i7',
      }),
    ).toBe('Laptops');

    expect(
      matchSubcategoryName(undefined, 'Electronics', {
        title: 'Apple iPad Air M2 11-inch',
      }),
    ).toBe('Tablets');

    expect(
      matchSubcategoryName(undefined, 'Fashion', {
        title: 'Floral Silk Maxi Dress for Women',
      }),
    ).toBe("Women's Dresses");

    expect(
      matchSubcategoryName(undefined, 'Fashion', {
        title: 'Classic White Leather Sneakers EU 42',
      }),
    ).toBe('Shoes');

    expect(
      matchSubcategoryName(undefined, 'Jewelry & Watches', {
        title: 'Casio Edifice Stainless Steel Chronograph Watch',
      }),
    ).toBe('Watches');
  });

  it('normalizes dimensions, weight, specs, and auto-fills subcategory cleanly', () => {
    const attrs = normalizeProductAttributes(
      {
        dimensions: { length: '15.5', width: 7.4, height: '0.8', unit: 'cm' },
        weight: { value: '0.22', unit: 'kg' },
        color: '  Natural Titanium ',
        material: 'Titanium',
        size: '256GB',
        warranty: '1-Year Warranty',
        sku: 'IP15PM-256',
      },
      'Electronics',
      { title: 'iPhone 15 Pro Max 256GB' },
    );

    expect(attrs).toEqual({
      subcategory: 'Phones',
      dimensions: { length: 15.5, width: 7.4, height: 0.8, unit: 'cm' },
      weight: { value: 0.22, unit: 'kg' },
      color: 'Natural Titanium',
      material: 'Titanium',
      size: '256GB',
      warranty: '1-Year Warranty',
      sku: 'IP15PM-256',
    });
  });

  it('filters GET /products by subcategory using JSONB path + keyword fallback', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      product: {
        findMany,
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;
    const service = new ProductService(
      prisma,
      {} as any,
      {} as any,
      { record: jest.fn() } as any,
    );

    await service.getProducts({
      category: 'Electronics',
      subcategory: 'Phones',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { attributes: { path: ['subcategory'], equals: 'Phones' } },
              ]),
            }),
          ]),
        }),
      }),
    );
  });
});
