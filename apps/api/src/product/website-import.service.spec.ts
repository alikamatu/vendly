import { BadRequestException } from '@nestjs/common';
import {
  discoverProductLinksFromHtml,
  extractBestImageFromTag,
  extractBestUrlFromSrcset,
  extractImageUrls,
  extractProductsFromJsonPayload,
  extractStructuredProductsFromHtml,
  mapShopifyProductToPreview,
  mapWooProductToPreview,
  matchCategoryName,
  resolveImageUrl,
  validatePublicWebsiteUrl,
  WebsiteImportService,
} from './website-import.service';

describe('WebsiteImportService & extractors', () => {
  const categories = ['Electronics', 'Fashion', 'Home & Living'];
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('validatePublicWebsiteUrl', () => {
    it('accepts public store URLs with or without protocol', () => {
      expect(
        validatePublicWebsiteUrl('mystore.com/products/bag').toString(),
      ).toBe('https://mystore.com/products/bag');
      expect(validatePublicWebsiteUrl('https://shop.accra.gh').toString()).toBe(
        'https://shop.accra.gh/',
      );
    });

    it('blocks localhost, loopback, link-local, and private RFC-1918 networks', () => {
      for (const bad of [
        'http://localhost:3000',
        'http://127.0.0.1/admin',
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.5/products.json',
        'http://192.168.1.10',
        'http://172.16.0.1',
        'file:///etc/passwd',
      ]) {
        expect(() => validatePublicWebsiteUrl(bad)).toThrow(
          BadRequestException,
        );
      }
    });
  });

  describe('extractStructuredProductsFromHtml (anti-site-metadata regression)', () => {
    it('NEVER mistakes generic website og:title and og:description for a product', () => {
      const homepageHtml = `
        <html>
          <head>
            <title>Kente Studio — Best Fashion Store in Accra</title>
            <meta property="og:type" content="website" />
            <meta property="og:title" content="Kente Studio — Best Fashion Store in Accra" />
            <meta property="og:description" content="Shop authentic handmade clothing and accessories across Ghana." />
            <meta property="og:image" content="https://kentestudio.com/hero-banner.jpg" />
          </head>
          <body><h1>Welcome to Kente Studio</h1></body>
        </html>
      `;

      const catalogItems = extractStructuredProductsFromHtml(
        homepageHtml,
        new URL('https://kentestudio.com'),
        categories,
        false,
      );
      expect(catalogItems).toEqual([]);

      const singleModeItems = extractStructuredProductsFromHtml(
        homepageHtml,
        new URL('https://kentestudio.com'),
        categories,
        true,
      );
      expect(singleModeItems).toEqual([]);
    });

    it('extracts real product from explicit product OpenGraph / price meta tags on a single product page', () => {
      const productHtml = `
        <html>
          <head>
            <meta property="og:type" content="product" />
            <meta property="og:title" content="Woven Leather Sandals | Kente Studio" />
            <meta property="og:description" content="Handcrafted brown leather sandals with cushioned sole." />
            <meta property="og:image" content="/images/sandals.jpg" />
            <meta property="product:price:amount" content="240.00" />
            <meta property="product:price:currency" content="GHS" />
          </head>
          <body><h1>Woven Leather Sandals</h1></body>
        </html>
      `;

      const items = extractStructuredProductsFromHtml(
        productHtml,
        new URL('https://kentestudio.com/products/woven-leather-sandals'),
        categories,
        true,
      );

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        title: 'Woven Leather Sandals',
        price: 240,
        currency: 'GHS',
        image_urls: ['https://kentestudio.com/images/sandals.jpg'],
      });
    });

    it('extracts products from Next.js __NEXT_DATA__ payloads', () => {
      const nextHtml = `
        <html>
          <body>
            <script id="__NEXT_DATA__" type="application/json">
              ${JSON.stringify({
                props: {
                  pageProps: {
                    products: [
                      {
                        id: 'p1',
                        title: 'Brass Cuff Bracelet',
                        description:
                          'Hammered recycled brass cuff handmade in Accra.',
                        price: 110,
                        currency: 'GHS',
                        category: 'Fashion',
                        image_urls: ['https://cdn.shop.gh/cuff.jpg'],
                      },
                    ],
                  },
                },
              })}
            </script>
          </body>
        </html>
      `;

      const items = extractStructuredProductsFromHtml(
        nextHtml,
        new URL('https://shop.gh'),
        categories,
        false,
      );
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        title: 'Brass Cuff Bracelet',
        price: 110,
        category: 'Fashion',
        image_urls: ['https://cdn.shop.gh/cuff.jpg'],
      });
    });
  });

  describe('discoverProductLinksFromHtml & subpage crawling', () => {
    it('discovers product detail links while ignoring cart/login/about links', () => {
      const html = `
        <a href="/about">About</a>
        <a href="/cart">Cart</a>
        <a href="/products">All Products</a>
        <a href="/product/linen-shirt-sand">Linen Shirt</a>
        <a href="/products/ceramic-mug-350ml">Ceramic Mug</a>
      `;
      const { productUrls, catalogUrls } = discoverProductLinksFromHtml(
        html,
        new URL('https://store.example.com'),
      );
      expect(productUrls.map((u) => u.pathname)).toEqual([
        '/product/linen-shirt-sand',
        '/products/ceramic-mug-350ml',
      ]);
      expect(catalogUrls.map((u) => u.pathname)).toEqual(['/products']);
    });

    it('crawls discovered product pages when store homepage only has links + site meta', async () => {
      const mockFetch = jest.fn(async (url: string) => {
        if (
          url.includes('/products.json') ||
          url.includes('/wp-json/wc/store')
        ) {
          return { ok: false, status: 404 } as Response;
        }
        if (url === 'https://mystore.gh/') {
          return {
            ok: true,
            status: 200,
            text: async () => `
              <html>
                <head>
                  <meta property="og:title" content="MyStore GH — Official Website" />
                  <meta property="og:description" content="Welcome to MyStore GH." />
                </head>
                <body>
                  <a href="/product/shea-body-butter">Shea Body Butter</a>
                </body>
              </html>
            `,
          } as Response;
        }
        if (url === 'https://mystore.gh/product/shea-body-butter') {
          return {
            ok: true,
            status: 200,
            text: async () => `
              <html><head>
                <script type="application/ld+json">
                  {
                    "@type": "Product",
                    "name": "Raw Shea Body Butter 250g",
                    "description": "Unrefined northern Ghana whipped shea body butter.",
                    "image": "https://mystore.gh/img/shea.jpg",
                    "offers": { "price": "75.00", "priceCurrency": "GHS" }
                  }
                </script>
              </head></html>
            `,
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });
      global.fetch = mockFetch;

      const service = new WebsiteImportService(
        {
          category: {
            findMany: jest.fn().mockResolvedValue([{ name: 'Beauty' }]),
          },
        } as never,
        { isConfigured: () => false } as never,
        {} as never,
      );

      const res = await service.previewWebsite('https://mystore.gh', 'auto');
      expect(res.items).toHaveLength(1);
      expect(res.items[0]).toMatchObject({
        title: 'Raw Shea Body Butter 250g',
        price: 75,
        image_urls: ['https://mystore.gh/img/shea.jpg'],
      });
    });
  });

  describe('Shopify & WooCommerce mappers', () => {
    it('maps Shopify JSON product with compare_at_price, images, tags, and vendor', () => {
      const item = mapShopifyProductToPreview(
        {
          id: 991,
          title: 'Handwoven Bolga Tote',
          handle: 'handwoven-bolga-tote',
          body_html:
            '<p>Durable handwoven straw tote with leather handles.</p>',
          vendor: 'Accra Craft',
          product_type: 'Fashion',
          tags: ['tote', 'handmade', 'ghana'],
          variants: [
            { price: '185.00', compare_at_price: '220.00', available: true },
          ],
          images: [{ src: 'https://cdn.shopify.com/tote-1.jpg' }],
        },
        'https://accracraft.com',
        categories,
      );

      expect(item).toMatchObject({
        externalId: '991',
        title: 'Handwoven Bolga Tote',
        price: 185,
        original_price: 220,
        category: 'Fashion',
        brand: 'Accra Craft',
      });
    });

    it('maps WooCommerce Store API minor-unit prices and images cleanly', () => {
      const item = mapWooProductToPreview(
        {
          id: 42,
          name: 'Wireless Studio Headphones',
          short_description:
            '<p>Over-ear Bluetooth headphones with 30-hour battery.</p>',
          prices: {
            price: '32000',
            regular_price: '38000',
            currency_minor_unit: 2,
            currency_code: 'GHS',
          },
          categories: [{ name: 'Electronics' }],
          images: [{ src: 'https://shop.example.com/hp.jpg' }],
          is_in_stock: true,
        },
        categories,
      );

      expect(item).toMatchObject({
        title: 'Wireless Studio Headphones',
        price: 320,
        original_price: 380,
      });
    });

    it('resolves protocol-relative //cdn.shopify.com images, Next.js /_next/image wrappers, &amp; entities, lazy data-src, high-res srcset, and Yoast @id ImageObject references', () => {
      const base = new URL('https://mystore.gh/products/bag');

      // 1. Protocol-relative Shopify image + &amp; query params
      expect(
        resolveImageUrl(
          '//cdn.shopify.com/s/files/1/bag.jpg?v=123&amp;width=1080',
          base,
        ),
      ).toBe('https://cdn.shopify.com/s/files/1/bag.jpg?v=123&width=1080');

      // 2. Next.js /_next/image?url=... unwrapping
      expect(
        resolveImageUrl(
          '/_next/image?url=https%3A%2F%2Fcdn.mystore.gh%2Fuploads%2Fkente-dress.webp&amp;w=640&amp;q=75',
          base,
        ),
      ).toBe('https://cdn.mystore.gh/uploads/kente-dress.webp');

      // 3. Lazy-loaded <img src="data:..." data-src="..."> (data-src wins over placeholder src)
      expect(
        extractBestImageFromTag(
          '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="/media/sandals-full.jpg" alt="Sandals" />',
          base,
        ),
      ).toBe('https://mystore.gh/media/sandals-full.jpg');

      // 4. Responsive srcset picks crisp 1080w over 32w blur-up thumbnail
      expect(
        extractBestUrlFromSrcset(
          '/img/bag-32.jpg 32w, /img/bag-480.jpg 480w, /img/bag-1080.jpg 1080w',
          base,
        ),
      ).toBe('https://mystore.gh/img/bag-1080.jpg');

      // 5. Yoast / RankMath JSON-LD @graph with @id ImageObject reference
      const yoastHtml = `
        <html><head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "ImageObject",
                  "@id": "https://mystore.gh/product/beaded-bag/#primaryimage",
                  "contentUrl": "https://mystore.gh/wp-content/uploads/beaded-bag.jpg"
                },
                {
                  "@type": "Product",
                  "name": "Beaded Shoulder Bag",
                  "description": "Hand-beaded evening shoulder bag crafted in Accra.",
                  "image": { "@id": "https://mystore.gh/product/beaded-bag/#primaryimage" },
                  "offers": { "@type": "Offer", "price": "290.00", "priceCurrency": "GHS" }
                }
              ]
            }
          </script>
        </head></html>
      `;
      const items = extractStructuredProductsFromHtml(
        yoastHtml,
        new URL('https://mystore.gh/product/beaded-bag'),
        categories,
        true,
      );
      expect(items).toHaveLength(1);
      expect(items[0].image_urls).toEqual([
        'https://mystore.gh/wp-content/uploads/beaded-bag.jpg',
      ]);
    });

    it('extracts client-rendered Next.js SPA product via discovered JS bundle API (priceCents, GHC, images)', async () => {
      const mockFetch = jest.fn(async (url: string) => {
        if (url.endsWith('.json')) {
          return { ok: false, status: 404 } as Response;
        }
        if (
          url ===
          'https://www.forbesdigitals.com/products/6a80ac588851a5e19a719268'
        ) {
          return {
            ok: true,
            status: 200,
            text: async () => `
              <html>
                <head>
                  <script src="/_next/static/chunks/app/products/%5Bid%5D/page-abc.js"></script>
                  <meta property="og:title" content="Forbes Digital Lifeline" />
                  <meta property="og:type" content="website" />
                </head>
                <body><main><div class="animate-pulse"></div></main></body>
              </html>
            `,
          } as Response;
        }
        if (url.includes('/page-abc.js')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              `const API="https://fdl-commerce.onrender.com";fetch(API+"/api/products/"+id);`,
          } as Response;
        }
        if (
          url ===
          'https://fdl-commerce.onrender.com/api/products/6a80ac588851a5e19a719268'
        ) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              success: true,
              data: {
                _id: '6a80ac588851a5e19a719268',
                sku: '043',
                title: 'HP Elite x360 830 G9, Core i5 12th Gen',
                description:
                  'Open Box Condition - Works and looks like new with Windows 11 Pro.',
                priceCents: 700000,
                currency: 'GHC',
                categoryId: { name: 'Electronics' },
                images: [
                  {
                    url: 'https://res.cloudinary.com/demo/image/upload/img2.jpg',
                    position: 1,
                  },
                  {
                    url: 'https://res.cloudinary.com/demo/image/upload/img1.jpg',
                    position: 0,
                  },
                ],
              },
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });
      global.fetch = mockFetch;

      const service = new WebsiteImportService(
        {
          category: {
            findMany: jest.fn().mockResolvedValue([{ name: 'Electronics' }]),
          },
        } as never,
        { isConfigured: () => false } as never,
        {} as never,
      );

      const res = await service.previewWebsite(
        'https://www.forbesdigitals.com/products/6a80ac588851a5e19a719268',
        'auto',
      );
      expect(res.items).toHaveLength(1);
      expect(res.items[0]).toMatchObject({
        title: 'HP Elite x360 830 G9, Core i5 12th Gen',
        price: 7000,
        currency: 'GHS',
        category: 'Electronics',
        image_urls: [
          'https://res.cloudinary.com/demo/image/upload/img1.jpg',
          'https://res.cloudinary.com/demo/image/upload/img2.jpg',
        ],
        status: 'active',
      });

      // Also verify direct JSON array catalog payload mapping
      const catalogItems = extractProductsFromJsonPayload(
        {
          products: [
            {
              id: '1',
              name: 'USB-C Hub',
              price: 180,
              images: ['https://cdn.example.gh/hub.jpg'],
            },
          ],
        },
        new URL('https://example.gh'),
        categories,
        false,
      );
      expect(catalogItems).toHaveLength(1);
      expect(catalogItems[0].price).toBe(180);
    });

    it('extracts Jumia-style ImageObject with array contentUrl, ignores boolean data-lazy="true", and auto-detects .html product URLs', () => {
      const jumiaUrl = new URL(
        'https://www.jumia.com.gh/hansen-18-inch-standing-fan-black-300573915.html',
      );
      const jumiaHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "Product",
                    "@id": "#product",
                    "name": "HANSEN 18 Inch 3-Speed Standing Fan - Black",
                    "description": "18 inch standing fan with 3 step speed control and iron mesh.",
                    "brand": { "@type": "Brand", "name": "HANSEN" },
                    "category": "Electronics",
                    "offers": {
                      "@type": "Offer",
                      "price": "135.00",
                      "priceCurrency": "GHS",
                      "availability": "http://schema.org/InStock"
                    },
                    "image": {
                      "@type": "ImageObject",
                      "contentUrl": [
                        "https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/51/9375003/1.jpg?3579",
                        "https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/51/9375003/2.jpg?3579",
                        "https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/51/9375003/3.jpg?3580"
                      ]
                    }
                  }
                ]
              }
            </script>
          </head>
          <body>
            <img data-lazy="true" data-src="https://gh.jumia.is/unsafe/fit-in/500x500/product/1.jpg" src="data:image/svg+xml,..." />
          </body>
        </html>
      `;

      const items = extractStructuredProductsFromHtml(
        jumiaHtml,
        jumiaUrl,
        categories,
        false,
      );
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        title: 'HANSEN 18 Inch 3-Speed Standing Fan - Black',
        price: 135,
        currency: 'GHS',
        brand: 'HANSEN',
        image_urls: [
          'https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/51/9375003/1.jpg?3579',
          'https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/51/9375003/2.jpg?3579',
          'https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/51/9375003/3.jpg?3580',
        ],
      });

      // Boolean `data-lazy="true"` must never resolve to https://.../true
      expect(
        extractImageUrls(
          { contentUrl: ['true', 'https://gh.jumia.is/1.jpg'] },
          jumiaUrl,
        ),
      ).toEqual(['https://gh.jumia.is/1.jpg']);

      // Jumia .html product links are discovered cleanly as product URLs
      const discovered = discoverProductLinksFromHtml(
        '<a href="/hansen-18-inch-standing-fan-black-300573915.html">Fan</a>',
        new URL('https://www.jumia.com.gh/'),
      );
      expect(discovered.productUrls.map((u) => u.pathname)).toEqual([
        '/hansen-18-inch-standing-fan-black-300573915.html',
      ]);
    });

    it('accurately resolves Verndly categories from narrow storefront categories, BreadcrumbList, and product metadata', () => {
      const verndlyCategories = [
        'Art & Crafts',
        'Baby & Kids',
        'Beauty & Personal Care',
        'Books & Stationery',
        'Electronics',
        'Fashion',
        'Food & Beverages',
        'Health & Wellness',
        'Home & Kitchen',
        'Jewelry & Watches',
        'Office Supplies',
        'Services',
        'Sports & Outdoors',
        'Toys & Games',
        'Vehicles & Parts',
      ];

      // 1. Jumia leaf category "Pedestal Fans" + BreadcrumbList -> Home & Kitchen (NOT alphabetical Art & Crafts)
      const jumiaFanHtml = `
        <html><head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home" },
                    { "@type": "ListItem", "position": 2, "name": "Home & Office" },
                    { "@type": "ListItem", "position": 3, "name": "Appliances" },
                    { "@type": "ListItem", "position": 4, "name": "Pedestal Fans" },
                    { "@type": "ListItem", "position": 5, "name": "HANSEN 18 Inch Standing Fan" }
                  ]
                },
                {
                  "@type": "Product",
                  "name": "HANSEN 18 Inch 3-Speed Standing Fan - Black",
                  "description": "Durable standing fan for home and office cooling.",
                  "category": "Pedestal Fans",
                  "image": "https://gh.jumia.is/product/fan.jpg",
                  "offers": { "price": "135.00", "priceCurrency": "GHS" }
                }
              ]
            }
          </script>
        </head></html>
      `;
      const jumiaItems = extractStructuredProductsFromHtml(
        jumiaFanHtml,
        new URL('https://www.jumia.com.gh/hansen-standing-fan-300573915.html'),
        verndlyCategories,
        true,
      );
      expect(jumiaItems[0].category).toBe('Home & Kitchen');

      // 2. Bare "Home" root breadcrumb must NOT steal laptops away from Electronics
      expect(
        matchCategoryName('Windows Laptops', verndlyCategories, {
          breadcrumbs: ['Home', 'Computers', 'Windows Laptops'],
          title: 'HP Elite x360 830 G9, Core i5 12th Gen',
        }),
      ).toBe('Electronics');

      // 3. Smartwatch stays in Electronics while analog wristwatch goes to Jewelry & Watches
      expect(
        matchCategoryName('', verndlyCategories, {
          title: 'Apple Watch Series 9 GPS Smartwatch 45mm',
        }),
      ).toBe('Electronics');
      expect(
        matchCategoryName('', verndlyCategories, {
          title: 'Casio Stainless Steel Chronograph Wrist Watch',
        }),
      ).toBe('Jewelry & Watches');

      // 4. Beauty, Fashion, and Jewelry without explicit category tags
      expect(
        matchCategoryName('', verndlyCategories, {
          title: 'Raw Shea Body Butter 250g',
          description: 'Unrefined northern Ghana moisturizing skincare butter.',
        }),
      ).toBe('Beauty & Personal Care');
      expect(
        matchCategoryName('', verndlyCategories, {
          title: 'Woven Leather Sandals',
        }),
      ).toBe('Fashion');
      expect(
        matchCategoryName('', verndlyCategories, {
          title: 'Hammered Brass Cuff Bracelet',
        }),
      ).toBe('Jewelry & Watches');
    });

    it('discovers SPA API base URL even when buried in later Next.js chunks and when base URL includes /api prefix', async () => {
      const verndlyCategories = ['Art & Crafts', 'Electronics', 'Fashion'];
      const mockFetch = jest.fn(async (url: string) => {
        if (url.endsWith('.json')) {
          return { ok: false, status: 404 } as Response;
        }
        if (
          url ===
          'https://www.forbesdigitals.com/products/6a80ac588851a5e19a719268'
        ) {
          return {
            ok: true,
            status: 200,
            text: async () => `
              <html>
                <head>
                  <link rel="canonical" href="https://forbesdigitals.com" />
                  <script src="/_next/static/chunks/43d3624b-vendor1.js"></script>
                  <script src="/_next/static/chunks/817-vendor2.js"></script>
                  <script src="/_next/static/chunks/main-app-abc.js"></script>
                  <script src="/_next/static/chunks/611-vendor3.js"></script>
                  <script src="/_next/static/chunks/903-vendor4.js"></script>
                  <script src="/_next/static/chunks/112-vendor5.js"></script>
                  <script src="/_next/static/chunks/app/layout-xyz.js"></script>
                  <script src="/_next/static/chunks/545-shared.js"></script>
                  <script src="/_next/static/chunks/155-apiclient.js"></script>
                  <script src="/_next/static/chunks/app/products/%5Bid%5D/page-4012.js"></script>
                </head>
                <body><main></main></body>
              </html>
            `,
          } as Response;
        }
        if (url.includes('/155-apiclient.js')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              `const API_BASE="https://fdl-commerce.onrender.com/api";export const getProduct=(id)=>fetch(API_BASE+"/products/"+id);`,
          } as Response;
        }
        if (url.includes('/_next/static/chunks/')) {
          return {
            ok: true,
            status: 200,
            text: async () => `console.log("chunk");`,
          } as Response;
        }
        if (
          url ===
          'https://fdl-commerce.onrender.com/api/products/6a80ac588851a5e19a719268'
        ) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
              success: true,
              data: {
                _id: '6a80ac588851a5e19a719268',
                title: 'HP Elite x360 830 G9, Core i5 12th Gen',
                description:
                  'Open Box Condition - Works and looks like new with Windows 11 Pro.',
                priceCents: 700000,
                currency: 'GHC',
                categoryId: { name: 'Windows Laptops' },
                images: [
                  {
                    url: 'https://res.cloudinary.com/demo/image/upload/hp.jpg',
                    position: 0,
                  },
                ],
              },
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      });
      global.fetch = mockFetch;

      const service = new WebsiteImportService(
        {
          category: {
            findMany: jest
              .fn()
              .mockResolvedValue(verndlyCategories.map((name) => ({ name }))),
          },
        } as never,
        { isConfigured: () => false } as never,
        {} as never,
      );

      const res = await service.previewWebsite(
        'https://www.forbesdigitals.com/products/6a80ac588851a5e19a719268',
        'auto',
      );
      expect(res.items).toHaveLength(1);
      expect(res.items[0]).toMatchObject({
        title: 'HP Elite x360 830 G9, Core i5 12th Gen',
        price: 7000,
        currency: 'GHS',
        category: 'Electronics',
        image_urls: ['https://res.cloudinary.com/demo/image/upload/hp.jpg'],
      });
    });
  });
});
