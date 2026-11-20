import CategoriesGalleryClient from '@/components/categories/CategoriesGalleryClient';
import {
  fetchBrandsServer,
  fetchCategoriesServer,
  fetchHomeProductsServer,
} from '@/lib/server-api';

export default async function CategoriesPage() {
  const [categories, brands, products] = await Promise.all([
    fetchCategoriesServer(),
    fetchBrandsServer(),
    fetchHomeProductsServer(100),
  ]);

  return (
    <CategoriesGalleryClient
      initialCategories={categories}
      initialBrands={brands}
      initialProducts={products}
    />
  );
}
