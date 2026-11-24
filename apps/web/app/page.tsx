import HomeView from '@/components/home/HomeView';
import { buildMetadata } from '@/lib/seo';
import ItemListJsonLd from '@/components/seo/ItemListJsonLd';
import {
  fetchBrandsServer,
  fetchCategoriesServer,
  fetchHomeProductsServer,
  fetchTopProVendorsServer,
} from '@/lib/server-api';
import { filterRailProducts } from '@/lib/product-visibility';
import { getProductPath } from '@/lib/product-slug';

export const metadata = buildMetadata({
  title: 'Verndly — Discover & Shop Verified Independent Stores in Ghana',
  description:
    'Browse verified products from independent stores and young entrepreneurs across Ghana. Protected by 7-day Paystack escrow, flat 4% seller fees, and nationwide courier delivery.',
  path: '/',
  keywords: [
    'Ghana marketplace',
    'online shopping Ghana',
    'buy online Accra',
    'independent stores Ghana',
    'verified sellers Ghana',
    'electronics fashion beauty Ghana',
    'Paystack escrow shopping',
    'Verndly',
  ],
});

export default async function HomePage() {
  const [products, categories, brands, topProVendors] = await Promise.all([
    fetchHomeProductsServer(48),
    fetchCategoriesServer(),
    fetchBrandsServer(),
    fetchTopProVendorsServer(6),
  ]);

  const inStockProducts = filterRailProducts(products);
  const topProducts = inStockProducts.slice(0, 16);

  return (
    <>
      {topProducts.length > 0 && (
        <ItemListJsonLd
          name="Top Featured Products on Verndly"
          description="Trending and featured products from verified independent stores across Ghana."
          items={topProducts.map((p: any) => ({
            id: String(p.id),
            name: p.title,
            url: getProductPath(p),
            image: p.image_urls?.[0] || null,
            price: p.price,
            currency: p.currency || 'GHS',
            description: p.description,
          }))}
        />
      )}
      <HomeView
        initialData={{
          products,
          categories,
          brands,
          topProVendors,
        }}
      />
    </>
  );
}
