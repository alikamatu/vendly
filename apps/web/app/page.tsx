import HomeView from '@/components/home/HomeView';
import { buildMetadata } from '@/lib/seo';
import ItemListJsonLd from '@/components/seo/ItemListJsonLd';
import {
  fetchBrandsServer,
  fetchCategoriesServer,
  fetchHomeProductsServer,
  fetchSellerExperienceReviewsServer,
  fetchTopProVendorsServer,
  fetchTopSellingCategoriesServer,
} from '@/lib/server-api';
import SellerExperienceJsonLd from '@/components/seo/SellerExperienceJsonLd';
import { filterRailProducts } from '@/lib/product-visibility';
import { getProductPath } from '@/lib/product-slug';

export const metadata = buildMetadata({
  title: 'Verndly — Ghana’s AI-Native Marketplace for Verified Stores',
  description:
    'Shop verified independent stores across Ghana with Verndly AI, read reviews from stores that sell here, or launch your online storefront in seconds with zero monthly rent and 3-day Paystack escrow protection.',
  path: '/',
  keywords: [
    'Ghana marketplace',
    'Verndly AI',
    'AI shopping Ghana',
    'online shopping Ghana',
    'buy online Accra',
    'independent stores Ghana',
    'verified sellers Ghana',
    'Paystack escrow shopping',
    'verified seller reviews Ghana',
    'Verndly',
  ],
});

export const revalidate = 300;

export default async function HomePage() {
  const [products, categories, brands, topProVendors, topSellingCategories, sellerExperience] =
    await Promise.all([
      fetchHomeProductsServer(48),
      fetchCategoriesServer(),
      fetchBrandsServer(),
      fetchTopProVendorsServer(6),
      fetchTopSellingCategoriesServer(10, 10),
      fetchSellerExperienceReviewsServer(),
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
      <SellerExperienceJsonLd experience={sellerExperience} />
      <HomeView
        sellerExperience={sellerExperience}
        initialData={{
          products,
          categories,
          brands,
          topProVendors,
          topSellingCategories,
        }}
      />
    </>
  );
}
