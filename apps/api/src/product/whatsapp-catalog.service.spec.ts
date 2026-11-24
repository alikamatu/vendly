import { BadRequestException } from '@nestjs/common';
import {
  extractProductsFromWhatsAppHtml,
  normalizeWhatsAppInputToUrls,
  parseMetaCatalogCsv,
  parsePriceValue,
  WhatsAppCatalogService,
} from './whatsapp-catalog.service';

describe('WhatsAppCatalogService & parsers', () => {
  const categories = ['Electronics', 'Fashion', 'Home & Living'];

  describe('normalizeWhatsAppInputToUrls', () => {
    it('normalizes Ghana local and international phone numbers to wa.me catalog URLs', () => {
      expect(normalizeWhatsAppInputToUrls('0241234567')).toEqual([
        'https://wa.me/c/233241234567',
      ]);
      expect(normalizeWhatsAppInputToUrls('+233 55 123 4567')).toEqual([
        'https://wa.me/c/233551234567',
      ]);
    });

    it('accepts multiple official wa.me product and catalog links', () => {
      const urls = normalizeWhatsAppInputToUrls(
        'https://wa.me/p/12345/233241234567\nwa.me/p/67890/233241234567',
      );
      expect(urls).toEqual([
        'https://wa.me/p/12345/233241234567',
        'https://wa.me/p/67890/233241234567',
      ]);
    });

    it('rejects non-WhatsApp hosts to prevent SSRF', () => {
      expect(() =>
        normalizeWhatsAppInputToUrls(
          'https://169.254.169.254/latest/meta-data',
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        normalizeWhatsAppInputToUrls('https://evil.example.com/catalog'),
      ).toThrow(BadRequestException);
    });
  });

  describe('parsePriceValue', () => {
    it('parses Ghana Cedis and Meta formatted prices cleanly', () => {
      expect(parsePriceValue('GH₵ 250.00')).toEqual({
        amount: 250,
        currency: 'GHS',
      });
      expect(parsePriceValue('1,450.50 GHS')).toEqual({
        amount: 1450.5,
        currency: 'GHS',
      });
      expect(parsePriceValue('₵85')).toEqual({ amount: 85, currency: 'GHS' });
      expect(parsePriceValue('USD 49.99')).toEqual({
        amount: 49.99,
        currency: 'USD',
      });
      expect(parsePriceValue('')).toEqual({ amount: null, currency: 'GHS' });
    });
  });

  describe('extractProductsFromWhatsAppHtml', () => {
    it('extracts products from JSON-LD ItemList', () => {
      const html = `
        <html><head>
          <script type="application/ld+json">
            {
              "@type": "ItemList",
              "itemListElement": [
                {
                  "@type": "Product",
                  "name": "Woven Kente Tote Bag",
                  "description": "Handmade woven tote bag with cotton lining.",
                  "category": "Fashion",
                  "image": ["https://scontent.whatsapp.net/tote.jpg"],
                  "offers": {
                    "price": "180.00",
                    "priceCurrency": "GHS",
                    "availability": "https://schema.org/InStock"
                  }
                }
              ]
            }
          </script>
        </head></html>
      `;
      const items = extractProductsFromWhatsAppHtml(
        html,
        'https://wa.me/c/233241234567',
        categories,
      );
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        title: 'Woven Kente Tote Bag',
        price: 180,
        currency: 'GHS',
        category: 'Fashion',
        image_urls: ['https://scontent.whatsapp.net/tote.jpg'],
      });
    });

    it('falls back to OpenGraph tags for individual wa.me/p product links', () => {
      const html = `
        <html><head>
          <meta property="og:title" content="Leather Crossbody Bag - WhatsApp" />
          <meta property="og:description" content="GHS 320.00 · Handcrafted brown leather bag." />
          <meta property="og:image" content="https://mmg.whatsapp.net/bag.jpg" />
        </head></html>
      `;
      const items = extractProductsFromWhatsAppHtml(
        html,
        'https://wa.me/p/111/233241234567',
        categories,
      );
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        title: 'Leather Crossbody Bag',
        price: 320,
        currency: 'GHS',
        image_urls: ['https://mmg.whatsapp.net/bag.jpg'],
      });
    });
  });

  describe('parseMetaCatalogCsv', () => {
    it('parses Meta Commerce Manager CSV with sale_price, image_link, and availability', () => {
      const csv = [
        'id,title,description,availability,condition,price,sale_price,image_link,additional_image_link,brand,fb_product_category,inventory',
        'sku-1,"Matte Ceramic Mug","Smooth matte ceramic mug 350ml.",in stock,new,"120.00 GHS","95.00 GHS","https://cdn.example.com/mug1.jpg","https://cdn.example.com/mug2.jpg",CraftGH,"Home & Living > Kitchen",14',
        'sku-2,"Bluetooth Earbuds","Compact wireless earbuds.",out of stock,refurbished,"350 GHS","","https://cdn.example.com/buds.jpg","",SoundX,"Electronics",0',
      ].join('\n');

      const { items, warnings } = parseMetaCatalogCsv(csv, categories);
      expect(warnings).toHaveLength(0);
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        externalId: 'sku-1',
        title: 'Matte Ceramic Mug',
        price: 95,
        original_price: 120,
        currency: 'GHS',
        category: 'Home & Living',
        condition: 'new',
        quantity_available: 14,
        brand: 'CraftGH',
        image_urls: [
          'https://cdn.example.com/mug1.jpg',
          'https://cdn.example.com/mug2.jpg',
        ],
      });
      expect(items[1]).toMatchObject({
        title: 'Bluetooth Earbuds',
        price: 350,
        original_price: null,
        category: 'Electronics',
        condition: 'refurbished',
        quantity_available: 0,
      });
    });
  });

  describe('commitImport', () => {
    it('mirrors remote images into Cloudinary and creates products', async () => {
      const mockPrisma = {
        sellerProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 'seller-1' }),
        },
        product: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'prod-123' }),
        },
      };
      const mockCloudinary = {
        uploadImageFromUrl: jest.fn().mockResolvedValue({
          secure_url: 'https://res.cloudinary.com/v/img.jpg',
        }),
      };
      const mockAudit = { record: jest.fn() };
      const mockGemini = {};

      const service = new WhatsAppCatalogService(
        mockPrisma as any,
        mockCloudinary as any,
        mockAudit as any,
        mockGemini as any,
      );

      const res = await service.commitImport('user-1', [
        {
          title: 'Handwoven Basket',
          description:
            'Traditional Bolga handwoven market basket with leather handles.',
          price: 220,
          category: 'Home & Living',
          image_urls: ['https://mmg.whatsapp.net/basket.jpg'],
          status: 'active',
        },
      ]);

      expect(mockCloudinary.uploadImageFromUrl).toHaveBeenCalledWith(
        'https://mmg.whatsapp.net/basket.jpg',
        'vendly_products',
      );
      expect(res.summary).toEqual({ created: 1, failed: 0, total: 1 });
      expect(res.results[0]).toMatchObject({
        ok: true,
        productId: 'prod-123',
        mirroredImages: 1,
      });
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Handwoven Basket',
            status: 'active',
            image_urls: ['https://res.cloudinary.com/v/img.jpg'],
          }),
        }),
      );
    });
  });
});
