import { ProductService } from './product.service';

describe('ProductService Top-Selling Categories & Cookie Recommendations', () => {
  function createHarness() {
    const sampleProducts = [
      {
        id: 'p-laptop-1',
        title: 'MacBook Air M2 256GB',
        category: 'Electronics',
        brand: 'Apple',
        price: 11500,
        is_featured: true,
        views_count: 140,
        rating_avg: 4.9,
        tags: ['laptop', 'macbook', 'apple'],
        attributes: { subcategory: 'Laptops' },
        image_urls: ['https://cdn.example.com/mac.jpg'],
        seller: {
          store_name: 'Accra Tech',
          logo_url: null,
          store_link: 'accra-tech',
          is_seller_verified: true,
          user: { is_pro: true, pro_expires_at: null },
        },
      },
      {
        id: 'p-shoe-1',
        title: 'Nike Air Force 1 White',
        category: 'Fashion',
        brand: 'Nike',
        price: 550,
        is_featured: false,
        views_count: 85,
        rating_avg: 4.7,
        tags: ['shoes', 'sneakers', 'nike'],
        attributes: { subcategory: 'Shoes' },
        image_urls: ['https://cdn.example.com/af1.jpg'],
        seller: {
          store_name: 'Kicks GH',
          logo_url: null,
          store_link: 'kicks-gh',
          is_seller_verified: true,
          user: { is_pro: false, pro_expires_at: null },
        },
      },
      {
        id: 'p-phone-1',
        title: 'Samsung Galaxy S24',
        category: 'Electronics',
        brand: 'Samsung',
        price: 8900,
        is_featured: false,
        views_count: 200,
        rating_avg: 4.8,
        tags: ['phone', 'samsung'],
        attributes: { subcategory: 'Phones' },
        image_urls: ['https://cdn.example.com/s24.jpg'],
        seller: {
          store_name: 'Accra Tech',
          logo_url: null,
          store_link: 'accra-tech',
          is_seller_verified: true,
          user: { is_pro: true, pro_expires_at: null },
        },
      },
    ];

    const prisma: any = {
      category: {
        findMany: jest.fn(async () => [
          {
            id: 'c1',
            name: 'Electronics',
            description: 'Tech',
            image_url: null,
          },
          { id: 'c2', name: 'Fashion', description: 'Style', image_url: null },
        ]),
      },
      product: {
        findMany: jest.fn(async () => sampleProducts),
      },
      orderItem: {
        findMany: jest.fn(async () => [
          { quantity: 5, order_id: 'o1', product: { category: 'Fashion' } },
          { quantity: 2, order_id: 'o2', product: { category: 'Electronics' } },
        ]),
      },
    };

    const service = new ProductService(
      prisma,
      {} as any,
      {} as any,
      { del: jest.fn() } as any,
    );
    return { service, prisma };
  }

  it('ranks top-selling categories by actual units sold & orders while attaching sample products', async () => {
    const { service } = createHarness();
    const top = await service.getTopSellingCategories(10, 5);

    expect(top).toHaveLength(2);
    // Fashion sold 5 units vs Electronics 2 units → Fashion is #1
    expect(top[0].rank).toBe(1);
    expect(top[0].name).toBe('Fashion');
    expect(top[0].units_sold).toBe(5);
    expect(top[0].products).toHaveLength(1);

    expect(top[1].rank).toBe(2);
    expect(top[1].name).toBe('Electronics');
    expect(top[1].units_sold).toBe(2);
    expect(top[1].subcategories.map((s) => s.name)).toContain('Laptops');
  });

  it('scores personalized recommendations from cookie habits and builds focus headline', async () => {
    const { service } = createHarness();
    const rec = await service.getPersonalizedRecommendations({
      subcategories: ['Laptops'],
      categories: ['Electronics'],
      brands: ['Apple'],
      tags: ['macbook'],
      minPrice: 9000,
      maxPrice: 13000,
      limit: 5,
    });

    expect(rec.personalized).toBe(true);
    expect(rec.focus_label).toBe('Laptops');
    expect(rec.headline).toBe('Laptops picked just for you');
    expect(rec.items[0].id).toBe('p-laptop-1');
  });
});
