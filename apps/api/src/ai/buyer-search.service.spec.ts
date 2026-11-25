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
    it('normalizes structured AI filters and swaps inverted price bounds', () => {
      const plan = normalizeBuyerSearchPlan(
        {
          summary:
            'Looking for brand new headphones between GH₵ 150 and GH₵ 350.',
          keywords: ['Headphones', 'earbuds', 'headphones'],
          category: 'electronics',
          min_price: 350,
          max_price: 150,
          condition: 'NEW',
          sort: 'price_asc',
          in_stock_only: true,
        },
        categories,
      );

      expect(plan).toEqual({
        summary:
          'Looking for brand new headphones between GH₵ 150 and GH₵ 350.',
        filters: {
          keywords: ['headphones', 'earbuds'],
          category: 'Electronics',
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

      expect(plan.filters.category).toBeNull();
      expect(plan.filters.sort).toBe('newest');
      expect(plan.filters.max_price).toBe(200);
    });
  });

  describe('extractFallbackSearchPlan', () => {
    it('extracts max price, condition, sort, and keywords deterministically', () => {
      const plan = extractFallbackSearchPlan(
        'cheap brand new sneakers under 250 cedis',
        categories,
      );

      expect(plan.filters).toMatchObject({
        keywords: ['sneakers'],
        max_price: 250,
        condition: 'new',
        sort: 'price_asc',
        in_stock_only: true,
      });
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
  });

  describe('BuyerSearchService.search', () => {
    it('rejects overly short queries', async () => {
      const service = new BuyerSearchService({} as never, {} as never);
      await expect(service.search('a')).rejects.toBeInstanceOf(
        BadRequestException,
      );
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
          summary: 'Looking for headphones under GH₵ 350.',
          filters: {
            keywords: ['headphones'],
            category: 'Electronics',
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
