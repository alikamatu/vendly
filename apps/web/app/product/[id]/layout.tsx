import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { productShareImagePath } from '@/lib/share/product-share';
import { getPublicBrand } from '@/lib/brand-guard';
import { isPubliclyVisible } from '@/lib/product-visibility';
import { buildProductSlug, getProductPath } from '@/lib/product-slug';
import ProductJsonLd from '@/components/seo/ProductJsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000').replace(/\/$/, '');

async function fetchProduct(id: string) {
  try {
    const res = await fetch(`${API_URL}/products/${encodeURIComponent(id)}`, {
      // ISR — revalidate every 5 min so price/stock stay reasonably fresh
      // without smashing the API on every crawl request.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json === 'object' && 'data' in json ? json.data : json;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product || !isPubliclyVisible(product)) {
    return buildMetadata({
      title: 'Product not found',
      description: "We couldn't find that product on Verndly.",
      noindex: true,
      path: `/product/${id}`,
    });
  }
  const canonicalPath = getProductPath(product);
  const description = (product.description || product.title || '').toString().slice(0, 180);
  const publicBrand = getPublicBrand(product.brand, product.seller);
  return buildMetadata({
    title: product.title,
    description: description || `Shop ${product.title} on Verndly.`,
    path: canonicalPath,
    image: productShareImagePath(String(product.id)),
    imageWidth: 1080,
    imageHeight: 1080,
    imageType: 'image/jpeg',
    type: 'product',
    keywords: [product.title, product.category, publicBrand, 'Verndly'].filter(Boolean) as string[],
  });
}

export default async function ProductLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);
  const visible = isPubliclyVisible(product);
  const canonicalPath = product ? getProductPath(product) : `/product/${id}`;
  const productSlug = product ? buildProductSlug(product) : id;
  return (
    <>
      {product && visible && (
        <>
          <ProductJsonLd
            product={{
              id: String(product.id),
              slug: productSlug,
              title: product.title,
              description: product.description,
              price: product.price,
              currency: product.currency,
              images: product.image_urls || [],
              rating_avg: product.rating_avg,
              rating_count: product.rating_count,
              condition: product.condition,
              brand: getPublicBrand(product.brand, product.seller),
              category: product.category,
              quantity_available: product.quantity_available,
              seller: product.seller
                ? {
                    store_name: product.seller.store_name,
                    store_link: product.seller.store_link,
                  }
                : null,
            }}
          />
          <BreadcrumbJsonLd
            items={[
              { name: 'Home', path: '/' },
              { name: 'Products', path: '/products' },
              ...(product.category
                ? [
                    {
                      name: product.category,
                      path: `/products?category=${encodeURIComponent(product.category)}`,
                    },
                  ]
                : []),
              { name: product.title, path: canonicalPath },
            ]}
          />
        </>
      )}
      {children}
    </>
  );
}
