import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GeminiService,
  matchOnboardingLocation,
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
        model: 'gemini-3.6-flash',
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

    it('automatically fails over to fallback model when primary returns 503 high demand and ignores thought parts', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: () =>
            Promise.resolve(
              '{"error":{"code":503,"message":"This model is currently experiencing high demand."}}',
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: {
                    parts: [
                      { thought: true, text: 'Let me inspect these photos...' },
                      {
                        text: JSON.stringify({
                          products: [
                            {
                              photo_indices: [0],
                              title: 'Canvas Sneaker',
                              description:
                                'Low-top white canvas sneaker with rubber toe cap and flat laces.',
                              category: 'Fashion',
                              condition: 'new',
                              brand: '',
                              tags: ['sneaker', 'canvas', 'shoes'],
                              suggested_price_ghs: 180,
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
        GEMINI_API_KEY: 'AQ.Ab8RN6ExampleKey1234567890',
        GEMINI_MODEL: 'gemini-4-hydrogen',
      });

      const res = await service.analyzeBulkProductPhotos(
        [makeFile('shoe.jpg')],
        ['Fashion', 'Electronics'],
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent',
      );
      expect(mockFetch.mock.calls[1][0]).toContain(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      );
      expect(res.products).toHaveLength(1);
      expect(res.products[0].title).toBe('Canvas Sneaker');
    });

    it('polishes an existing product listing with clean title, description, tags, and improvements', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        title: 'Black Leather Crossbody Bag',
                        description:
                          'Compact black leather crossbody bag with an adjustable strap, ideal for daily essentials.',
                        category: 'fashion',
                        tags: ['Crossbody Bag', 'Leather', 'Fashion'],
                        improvements: [
                          'Cleaned ALL CAPS title for readability',
                          'Expanded description for buyer clarity',
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

      const service = createService({ GEMINI_API_KEY: 'test-key' });
      const res = await service.polishProductListing(
        {
          title: 'BLACK LEATHER BAG DM TO ORDER',
          description: 'nice bag',
          category: 'Fashion',
          price: 180,
        },
        ['Electronics', 'Fashion'],
      );

      expect(res).toMatchObject({
        title: 'Black Leather Crossbody Bag',
        category: 'Fashion',
        tags: ['crossbody bag', 'leather', 'fashion'],
      });
      expect(res.improvements).toHaveLength(2);
    });

    it('drafts storefront bio, delivery policies, hours, and enums cleanly', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        bio: 'Accra Craft Studio makes handcrafted leather sandals and woven bags in East Legon.',
                        delivery_policies:
                          'Same-day courier delivery across Accra and nationwide dispatch within 2 days. All orders are protected by Verndly 7-day escrow.',
                        business_hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
                        service_area: 'NATIONWIDE',
                        avg_delivery_time: 'SAME_DAY',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      });
      global.fetch = mockFetch;

      const service = createService({ GEMINI_API_KEY: 'test-key' });
      const res = await service.draftStorefrontSetup({
        store_name: 'Accra Craft Studio',
        what_you_sell: 'Handmade leather sandals and woven bags in East Legon',
      });

      expect(res).toMatchObject({
        service_area: 'NATIONWIDE',
        avg_delivery_time: 'SAME_DAY',
        business_hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
      });
      expect(res.bio).toContain('Accra Craft Studio');
    });

    it('assists seller onboarding across all 3 steps and matches Ghana cities & neighborhoods', async () => {
      const ghanaLocations = [
        { id: '1', region: 'Greater Accra', city: 'Accra' },
        { id: '2', region: 'Ashanti', city: 'Kumasi' },
      ];

      expect(
        matchOnboardingLocation(
          '',
          '',
          'Sneakers in East Legon',
          ghanaLocations,
        ),
      ).toEqual({
        id: '1',
        region: 'Greater Accra',
        city: 'Accra',
      });

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        store_name: 'Legon Kicks Hub',
                        bio: 'Verified sneakers and streetwear based in East Legon, Accra with fast campus and citywide delivery.',
                        business_hours: 'Mon – Sat: 9:00 AM – 7:00 PM',
                        delivery_policies:
                          'Same-day rider dispatch in Accra and nationwide VIP bus delivery. Protected by Verndly 7-day escrow.',
                        whatsapp_number: '0244112233',
                        inferred_city: 'Accra',
                        inferred_region: 'Greater Accra',
                        area: 'East Legon',
                        service_area: 'NATIONWIDE',
                        avg_delivery_time: 'SAME_DAY',
                        recommended_payment_timing: 'UPFRONT_ONLY',
                        onboarding_tip:
                          'Upfront escrow eliminates no-show sneaker deliveries; drop your shoe photos right after launch.',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      });
      global.fetch = mockFetch;

      const service = createService({ GEMINI_API_KEY: 'test-key' });
      const res = await service.assistSellerOnboarding(
        {
          prompt:
            'I sell sneakers and hoodies in East Legon Accra, 0244112233, same day in Accra and nationwide delivery',
        },
        ghanaLocations,
      );

      expect(res).toMatchObject({
        store_name: 'Legon Kicks Hub',
        store_slug: 'legon-kicks-hub',
        area: 'East Legon',
        service_area: 'NATIONWIDE',
        avg_delivery_time: 'SAME_DAY',
        recommended_payment_timing: 'UPFRONT_ONLY',
        whatsapp_number: '0244112233',
        matched_location: { id: '1', region: 'Greater Accra', city: 'Accra' },
      });
    });
  });
});
