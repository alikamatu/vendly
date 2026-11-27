import { BadRequestException } from '@nestjs/common';
import { normalizeBuyerSearchPlan } from './gemini.service';
import {
  buildBrowseUrl,
  BuyerSearchService,
  extractFallbackSearchPlan,
} from './buyer-search.service';

describe('BuyerSearchService & parsers', () => {
  const categories = ['Electronics', 'Fashion', 'Home & Living', 'Beauty'];

  describe('normalizeBuyerSearchPlan', () => {
    it('normalizes structured AI filters, intent, subcategory, brand, and swaps inverted price bounds', () => {
      const plan = normalizeBuyerSearchPlan(
        {
          intent: 'shop',
          summary:
            'Looking for brand new headphones between GH₵ 150 and GH₵ 350.',
          follow_ups: ['Under GH₵ 250', 'Wireless only'],
          keywords: ['Headphones', 'earbuds', 'headphones'],
          category: 'electronics',
          subcategory: 'audio & headphones',
          brand: 'Sony',
          min_price: 350,
          max_price: 150,
          condition: 'NEW',
          sort: 'price_asc',
          in_stock_only: true,
        },
        categories,
      );

      expect(plan).toEqual({
        intent: 'shop',
        summary:
          'Looking for brand new headphones between GH₵ 150 and GH₵ 350.',
        follow_ups: ['Under GH₵ 250', 'Wireless only'],
        filters: {
          keywords: ['headphones', 'earbuds'],
          category: 'Electronics',
          subcategory: 'Audio & Headphones',
          brand: 'Sony',
          min_price: 150,
          max_price: 350,
          condition: 'new',
          sort: 'price_asc',
          in_stock_only: true,
        },
      });
    });

    it('returns null category when unrecognized instead of over-filtering', () => {
      const plan = normalizeBuyerSearchPlan(
        {
          summary: 'Gift ideas under GH₵ 200.',
          keywords: ['gift', 'perfume'],
          category: 'Gifts & Novelties',
          max_price: 200,
          condition: null,
          sort: 'unknown',
          in_stock_only: true,
        },
        categories,
      );

      expect(plan.intent).toBe('shop');
      expect(plan.filters.category).toBeNull();
      expect(plan.filters.sort).toBe('newest');
      expect(plan.filters.max_price).toBe(200);
    });

    it('preserves casual chat intent cleanly', () => {
      const plan = normalizeBuyerSearchPlan(
        {
          intent: 'chat',
          summary: 'Hey there! Doing great — how can I help you shop today?',
          follow_ups: ['Best deals right now', 'Laptops in stock'],
          keywords: [],
          category: null,
        },
        categories,
      );

      expect(plan.intent).toBe('chat');
      expect(plan.follow_ups).toEqual([
        'Best deals right now',
        'Laptops in stock',
      ]);
      expect(plan.filters.keywords).toEqual([]);
    });
  });

  describe('extractFallbackSearchPlan', () => {
    it('handles casual greetings conversationally without forcing a shop search', () => {
      const plan = extractFallbackSearchPlan('Hey how are you?', categories);

      expect(plan.intent).toBe('chat');
      expect(plan.summary.length).toBeGreaterThan(15);
      expect((plan.follow_ups ?? []).length).toBeGreaterThan(0);
      expect(plan.filters.keywords).toEqual([]);
    });

    it('answers Verndly 3-day escrow questions as chat intent', () => {
      const plan = extractFallbackSearchPlan(
        'How does Paystack escrow work on Verndly?',
        categories,
      );

      expect(plan.intent).toBe('chat');
      expect(plan.summary).toContain('3-day');
      expect(plan.summary).toMatch(/Paystack/i);
    });

    it('extracts max price, condition, sort, subcategory, and keywords deterministically', () => {
      const plan = extractFallbackSearchPlan(
        'cheap brand new sneakers under 250 cedis',
        categories,
      );

      expect(plan.intent).toBe('shop');
      expect(plan.filters).toMatchObject({
        keywords: ['sneakers'],
        subcategory: 'Sneakers',
        max_price: 250,
        condition: 'new',
        sort: 'price_asc',
        in_stock_only: true,
      });
    });

    it('detects new subcategories like Solar & Power Solutions', () => {
      const plan = extractFallbackSearchPlan(
        'solar inverter under 4000',
        categories,
      );

      expect(plan.filters.subcategory).toBe('Solar & Power Solutions');
      expect(plan.filters.max_price).toBe(4000);
    });

    it('extracts between price range and category match', () => {
      const plan = extractFallbackSearchPlan(
        'electronics between 100 and 500',
        categories,
      );

      expect(plan.filters).toMatchObject({
        category: 'Electronics',
        min_price: 100,
        max_price: 500,
      });
    });
  });

  describe('buildBrowseUrl', () => {
    it('encodes all non-null filters into /products query params', () => {
      const url = buildBrowseUrl({
        keywords: ['sneakers', 'shoes'],
        category: 'Fashion',
        subcategory: null,
        brand: null,
        min_price: 100,
        max_price: 300,
        condition: 'new',
        sort: 'price_asc',
        in_stock_only: true,
      });

      expect(url).toBe(
        '/products?search=sneakers&category=Fashion&min_price=100&max_price=300&condition=new&sort=price_asc&in_stock=true',
      );
    });

    it('uses subcategory param when subcategory is identified', () => {
      const url = buildBrowseUrl({
        keywords: ['macbook', 'laptop'],
        category: 'Electronics',
        subcategory: 'Laptops',
        brand: 'Apple',
        min_price: null,
        max_price: 8000,
        condition: null,
        sort: 'newest',
        in_stock_only: true,
      });

      expect(url).toContain('category=Electronics');
      expect(url).toContain('subcategory=Laptops');
      expect(url).toContain('max_price=8000');
    });
  });

  describe('BuyerSearchService.search', () => {
    it('rejects overly short queries', async () => {
      const service = new BuyerSearchService({} as never, {} as never);
      await expect(service.search('a')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('short-circuits casual chat without querying products DB', async () => {
      const findManyProducts = jest.fn();
      const mockPrisma = {
        category: {
          findMany: jest.fn().mockResolvedValue([{ name: 'Electronics' }]),
        },
        product: {
          findMany: findManyProducts,
        },
      };

      const mockGemini = {
        isConfigured: () => false,
      };

      const service = new BuyerSearchService(
        mockPrisma as never,
        mockGemini as never,
      );

      const res = await service.search('Hey! How are you?');

      expect(res.intent).toBe('chat');
      expect(res.products).toEqual([]);
      expect(res.total).toBe(0);
      expect(res.follow_ups.length).toBeGreaterThan(0);
      expect(findManyProducts).not.toHaveBeenCalled();
    });

    it('relaxes category filter automatically when strict query returns 0 rows', async () => {
      const findManyProducts = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'prod-1',
            title: 'Matte Black Over-Ear Headphones',
            price: 280,
            currency: 'GHS',
            category: 'Accessories',
            image_urls: ['https://res.cloudinary.com/v/hp.jpg'],
            seller: { store_name: 'Accra Sound', store_link: 'accra-sound' },
          },
        ]);

      const mockPrisma = {
        category: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ name: 'Electronics' }, { name: 'Fashion' }]),
        },
        product: {
          findMany: findManyProducts,
        },
      };

      const mockGemini = {
        isConfigured: () => true,
        parseBuyerSearchQuery: jest.fn().mockResolvedValue({
          intent: 'shop',
          summary: 'Looking for headphones under GH₵ 350.',
          follow_ups: ['Wireless only'],
          filters: {
            keywords: ['headphones'],
            category: 'Electronics',
            subcategory: null,
            brand: null,
            min_price: null,
            max_price: 350,
            condition: null,
            sort: 'price_asc',
            in_stock_only: true,
          },
        }),
      };

      const service = new BuyerSearchService(
        mockPrisma as never,
        mockGemini as never,
      );

      const res = await service.search('headphones under 350 cedis');

      expect(findManyProducts).toHaveBeenCalledTimes(2);
      expect(res.intent).toBe('shop');
      expect(res.relaxed).toBe(true);
      expect(res.usedAi).toBe(true);
      expect(res.total).toBe(1);
      expect(res.products[0]).toMatchObject({
        id: 'prod-1',
        title: 'Matte Black Over-Ear Headphones',
      });
    });

    it('falls back gracefully when Verndly AI throws an error', async () => {
      const mockPrisma = {
        category: {
          findMany: jest.fn().mockResolvedValue([{ name: 'Fashion' }]),
        },
        product: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'prod-2',
              title: 'Canvas Tote Bag',
              price: 120,
              currency: 'GHS',
              category: 'Fashion',
              image_urls: [],
              seller: { store_name: 'Kente Co', store_link: 'kente-co' },
            },
          ]),
        },
      };

      const mockGemini = {
        isConfigured: () => true,
        parseBuyerSearchQuery: jest
          .fn()
          .mockRejectedValue(new Error('temporary spike')),
      };

      const service = new BuyerSearchService(
        mockPrisma as never,
        mockGemini as never,
      );

      const res = await service.search('tote bag under 150');

      expect(res.usedAi).toBe(false);
      expect(res.total).toBe(1);
      expect(res.filters.max_price).toBe(150);
    });
  });
});
