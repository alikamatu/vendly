import { BadRequestException } from '@nestjs/common';
import {
  discoverProductLinksFromHtml,
  extractStructuredProductsFromHtml,
  mapShopifyProductToPreview,
  mapWooProductToPreview,
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
  });
});
