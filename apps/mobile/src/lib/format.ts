import type { Brand, Product } from './api/types';
import { DEFAULT_CURRENCY } from './config';

export function formatPrice(value: string | number | null | undefined, currency?: string) {
  const n = Number(value ?? 0);
  const symbol = !currency || currency === 'GHS' ? DEFAULT_CURRENCY : `${currency} `;
  return `${symbol}${(isNaN(n) ? 0 : n).toLocaleString('en-GH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function discountPercent(price: string | number, original?: string | number | null) {
  const p = Number(price);
  const o = Number(original ?? 0);
  if (!Number.isFinite(o) || !Number.isFinite(p) || o <= p || o <= 0) return 0;
  return Math.round(((o - p) / o) * 100);
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function shortOrderId(id: string) {
  return id.slice(-8).toUpperCase();
}

export function humanizeStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Digits only, at most 10. +233 / 233 prefixes fold into the local 0XXXXXXXXX form. */
export function sanitizePhoneInput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('+233')) cleaned = `0${cleaned.slice(4)}`;
  else if (cleaned.startsWith('233')) cleaned = `0${cleaned.slice(3)}`;
  return cleaned.replace(/\D/g, '').slice(0, 10);
}

/** Ghana numbers: accepts 024..., +233..., 233...; returns local 0XXXXXXXXX or null. */
export function normalizeGhanaPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '');
  let local = digits;
  if (local.startsWith('+233')) local = `0${local.slice(4)}`;
  else if (local.startsWith('233')) local = `0${local.slice(3)}`;
  else if (!local.startsWith('0') && local.length === 9) local = `0${local}`;
  return /^0\d{9}$/.test(local) ? local : null;
}

export const PASSWORD_RULE = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

/** Curated Unsplash photo used when a category has no custom image_url. */
export function resolveCategoryImage(name: string, customUrl?: string | null): string {
  if (customUrl) return customUrl;
  const n = name.toLowerCase();
  if (n.match(/electronic|phone|laptop|gadget|device/))
    return 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format&fit=crop&q=80';
  if (n.match(/cloth|wear|fashion|shoe|bag|apparel/))
    return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80';
  if (n.match(/book|study|education|note/))
    return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80';
  if (n.match(/home|furniture|decor|appliance/))
    return 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&auto=format&fit=crop&q=80';
  if (n.match(/cosmetic|beauty|care|perfume|makeup/))
    return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=80';
  if (n.match(/food|drink|snack|grocery|meal/))
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80';
  if (n.match(/service|job|gig|tutoring/))
    return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
}

export interface BrandBucket {
  id: string;
  name: string;
  brand: string;
  rank: number;
  logoUrl: string | null;
  totalCount: number;
  products: Product[];
}

export function groupByBrand(
  products: Product[],
  brandRefsOrMinCount: Brand[] | number = [],
  optsOrMaxProducts: { productsLimit?: number; brandsLimit?: number } | number = {},
): BrandBucket[] {
  const brandRefs = Array.isArray(brandRefsOrMinCount) ? brandRefsOrMinCount : [];
  const minCount = typeof brandRefsOrMinCount === 'number' ? brandRefsOrMinCount : 1;
  const productsLimit =
    typeof optsOrMaxProducts === 'number'
      ? optsOrMaxProducts
      : (optsOrMaxProducts.productsLimit ?? 10);
  const brandsLimit =
    typeof optsOrMaxProducts === 'number' ? undefined : optsOrMaxProducts.brandsLimit;

  const buckets = new Map<string, Product[]>();
  for (const p of products) {
    const name = (p.brand || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }

  const refByName = new Map<string, Brand>();
  for (const b of brandRefs) refByName.set(b.name.toLowerCase(), b);

  const list: BrandBucket[] = [];
  for (const [key, items] of buckets) {
    if (items.length < minCount) continue;
    const name = items[0].brand || key;
    const ref = refByName.get(key);
    list.push({
      id: ref?.id ?? key,
      name,
      brand: name,
      rank: 0,
      logoUrl: ref?.image_url ?? null,
      totalCount: items.length,
      products: items.slice(0, productsLimit),
    });
  }

  list.sort((a, b) => b.totalCount - a.totalCount);
  const sliced = brandsLimit ? list.slice(0, brandsLimit) : list;
  return sliced.map((item, idx) => ({ ...item, rank: idx + 1 }));
}

export function formatWhatsappUrl(phone?: string | null, message?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    digits = `233${digits.slice(1)}`;
  }
  if (digits.length < 9) return null;
  const qs = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${qs}`;
}
