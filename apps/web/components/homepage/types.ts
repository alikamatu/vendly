export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;
export const SPRING_GLIDE = { type: 'spring' as const, stiffness: 420, damping: 34 };

export interface HomepageProductPreview {
  id: string;
  slug?: string;
  title: string;
  price: number | string;
  original_price?: number | string | null;
  currency?: string;
  category: string;
  image_urls: string[];
  seller?: {
    store_name?: string;
    store_link?: string;
  } | null;
}

export interface HomepageVendorPreview {
  id: string;
  store_name: string;
  store_link: string;
  logo_url?: string | null;
  bio?: string | null;
}

export interface HomepageFaqEntry {
  question: string;
  answer: string;
}

export function formatPriceGhs(price: number | string | undefined | null): string {
  if (price === undefined || price === null) return '';
  const num = typeof price === 'number' ? price : parseFloat(price);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `GH₵ ${num.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
}
