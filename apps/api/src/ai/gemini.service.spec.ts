import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GeminiService,
  normalizeBulkAnalysis,
  normalizeSingleAnalysis,
} from './gemini.service';

function makeFile(name: string, mimetype = 'image/jpeg'): Express.Multer.File {
  return {
    fieldname: 'images',
    originalname: name,
    encoding: '7bit',
    mimetype,
    size: 16,
    buffer: Buffer.from('fake-image-bytes'),
  } as Express.Multer.File;
}

describe('GeminiService & normalizers', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function createService(env: Record<string, string | undefined>) {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new GeminiService(config);
  }

  describe('normalizeBulkAnalysis', () => {
    const categories = ['Electronics', 'Fashion', 'Home & Living'];

    it('keeps valid distinct product groups and normalizes fields', () => {
      const result = normalizeBulkAnalysis(
        {
          products: [
            {
              photo_indices: [0, 2],
              title: 'Black Ceramic Coffee Mug',
              description:
                'Matte black ceramic mug with curved handle and smooth interior glaze.',
              category: 'home & living',
              condition: 'NEW',
              brand: '',
              tags: ['#Mug', 'Ceramic', 'ceramic', 'Coffee Cup'],
              suggested_price_ghs: 84.6,
              confidence: 'high',
            },
            {
              photo_indices: [1],
              title: 'Woven Cotton Tote Bag',
              description:
                'Natural cream woven cotton tote bag with reinforced shoulder straps.',
              category: 'Fashion',
              condition: 'used',
              brand: 'KenteCraft',
              tags: ['tote', 'bag'],
              suggested_price_ghs: null,
              confidence: 'medium',
            },
          ],
        },
        3,
        categories,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        photo_indices: [0, 2],
        title: 'Black Ceramic Coffee Mug',
        category: 'Home & Living',
        condition: 'new',
        brand: '',
        tags: ['mug', 'ceramic', 'coffee cup'],
        suggested_price_ghs: 85,
        confidence: 'high',
      });
      expect(result[1]).toMatchObject({
        photo_indices: [1],
        category: 'Fashion',
        condition: 'used',
        brand: 'KenteCraft',
        suggested_price_ghs: null,
      });
    });

    it('splits groups exceeding 3 photos, deduplicates indices, and recovers omitted photos', () => {
      const result = normalizeBulkAnalysis(
        {
          products: [
            {
              photo_indices: [0, 1, 2, 3, 2, 99, -1],
              title: 'Leather Backpack',
              description: 'Brown leather backpack shown from four angles.',
              category: 'Unknown Category',
              condition: 'invalid',
              brand: '',
              tags: ['backpack'],
              suggested_price_ghs: -10,
              confidence: 'unknown',
            },
          ],
        },
        5, // photo 4 was omitted by Gemini
        categories,
      );

      expect(result).toHaveLength(3);
      expect(result[0].photo_indices).toEqual([0, 1, 2]);
      expect(result[0].category).toBe('Electronics');
      expect(result[0].condition).toBe('new');
      expect(result[0].suggested_price_ghs).toBeNull();
      expect(result[0].confidence).toBe('medium');

      expect(result[1].photo_indices).toEqual([3]);
      expect(result[1].title).toBe('Leather Backpack (2)');

      // Photo 4 recovered deterministically so nothing is dropped
      expect(result[2].photo_indices).toEqual([4]);
      expect(result[2].confidence).toBe('low');
    });
  });

  describe('normalizeSingleAnalysis', () => {
    it('normalizes single product fields safely', () => {
      const result = normalizeSingleAnalysis(
        {
          title: '  Wireless   Bluetooth Speaker ',
          description:
            'Compact cylindrical black portable speaker with fabric grille.',
          category: 'electronics',
          condition: 'refurbished',
          brand: 'JBL',
          tags: ['Speaker', 'audio', 'portable'],
          suggested_price_ghs: 320,
          confidence: 'high',
        },
        ['Electronics', 'Fashion'],
      );

      expect(result).toEqual({
        title: 'Wireless Bluetooth Speaker',
        description:
          'Compact cylindrical black portable speaker with fabric grille.',
        category: 'Electronics',
        condition: 'refurbished',
        brand: 'JBL',
        tags: ['speaker', 'audio', 'portable'],
        suggested_price_ghs: 320,
        confidence: 'high',
      });
    });
  });

  describe('GeminiService configuration & API calls', () => {
    it('reports unconfigured and throws ServiceUnavailableException when GEMINI_API_KEY is missing', async () => {
      const service = createService({});
      expect(service.isConfigured()).toBe(false);
      expect(service.getStatus()).toEqual({
        configured: false,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      });

      await expect(
        service.analyzeBulkProductPhotos([makeFile('a.jpg')], ['Electronics']),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('rejects non-image uploads before calling Gemini', async () => {
      const service = createService({ GEMINI_API_KEY: 'test-key' });
      await expect(
        service.analyzeBulkProductPhotos(
          [makeFile('doc.pdf', 'application/pdf')],
          ['Electronics'],
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('calls Gemini REST API with structured schema and parses grouped products', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      products: [
                        {
                          photo_indices: [0, 1],
                          title: 'Minimalist Desk Lamp',
                          description:
                            'Matte white adjustable aluminum desk lamp with circular weighted base.',
                          category: 'Home & Living',
                          condition: 'new',
                          brand: '',
                          tags: ['lamp', 'desk', 'lighting'],
                          suggested_price_ghs: 240,
                          confidence: 'high',
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const service = createService({
        GEMINI_API_KEY: 'test-key',
        GEMINI_MODEL: 'gemini-2.5-flash',
      });

      const res = await service.analyzeBulkProductPhotos(
        [makeFile('lamp-1.jpg'), makeFile('lamp-2.jpg')],
        ['Electronics', 'Home & Living'],
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('models/gemini-2.5-flash:generateContent');
      const body = JSON.parse(init.body);
      expect(body.generationConfig.responseMimeType).toBe('application/json');
      expect(body.contents[0].parts).toHaveLength(5); // intro text + 2 * (label + image)

      expect(res.totalPhotos).toBe(2);
      expect(res.model).toBe('gemini-2.5-flash');
      expect(res.products).toHaveLength(1);
      expect(res.products[0].photo_indices).toEqual([0, 1]);
      expect(res.products[0].title).toBe('Minimalist Desk Lamp');
    });
  });
});
