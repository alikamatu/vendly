import ProductsBrowser from '@/components/products-browser/ProductsBrowser';
import { buildMetadata } from '@/lib/seo';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import ItemListJsonLd from '@/components/seo/ItemListJsonLd';
import { isBrandAllowedPublicly } from '@/lib/brand-guard';
import {
  fetchBrandsServer,
  fetchBrowseProductsServer,
  fetchCategoriesServer,
} from '@/lib/server-api';

export const metadata = buildMetadata({
  title: 'Shop all products',
  description:
    'Browse, filter and search verified products on Verndly Ghana. Shop trusted independent stores across fashion, electronics, beauty, home, and more with 7-day Paystack escrow.',
  path: '/products',
  keywords: ['shop', 'buy online ghana', 'Ghana products', 'verified marketplace'],
});

export default async function ProductsPage() {
  const [browseRes, categories, brandsRaw] = await Promise.all([
    fetchBrowseProductsServer({ page: 1, limit: 24 }),
    fetchCategoriesServer(),
    fetchBrandsServer<any[]>(),
  ]);

  const brands = Array.from(
    new Set(
      (Array.isArray(brandsRaw) ? brandsRaw : [])
        .map((b: any) => b?.name)
        .filter((name: any) => Boolean(name) && isBrandAllowedPublicly(name)),
    ),
  ) as string[];

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' },
        ]}
      />
      {browseRes.data.length > 0 && (
        <ItemListJsonLd
          name="All Verified Products on Verndly"
          description="Curated marketplace listings from verified independent Ghanaian stores."
          items={browseRes.data.map((p: any) => ({
            id: String(p.id),
            name: p.title,
            url: `/product/${p.id}`,
            image: p.image_urls?.[0] || null,
            price: p.price,
            currency: p.currency || 'GHS',
            description: p.description,
          }))}
        />
      )}
      <ProductsBrowser
        initialData={browseRes}
        initialCategories={categories}
        initialBrands={brands}
      />
    </>
  );
}
