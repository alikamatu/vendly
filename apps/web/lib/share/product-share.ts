/**
 * Spotify-style product share.
 *
 * The OS share sheet receives the product photo as a file plus the title and
 * canonical link in the caption. Pasted links unfurl from the same photo via
 * `/api/share/product/:id`, which is also the Open Graph image.
 */
import { getProductPath, type ProductSlugLike } from '@/lib/product-slug';

export interface ShareableProduct extends ProductSlugLike {
  title?: string | null;
  price?: string | number | null;
  image_urls?: string[] | null;
  seller?: {
    store_name?: string | null;
    store_link?: string | null;
  } | null;
}

export type ProductShareResult = 'shared' | 'cancelled' | 'unavailable';

interface ShareDataWithFiles {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

const SHARE_TRANSFORM = 'c_fill,g_auto,w_1080,h_1080,f_jpg,q_auto:good';

/** Square JPEG Cloudinary URL. WhatsApp and iOS share both accept this reliably. */
export function toShareImageUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (!url.hostname.endsWith('cloudinary.com')) return raw;
    const marker = '/image/upload/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return raw;
    const rest = url.pathname
      .slice(idx + marker.length)
      .replace(new RegExp(`^(?:${SHARE_TRANSFORM}/)+`), '');
    url.pathname = `${url.pathname.slice(0, idx)}${marker}${SHARE_TRANSFORM}/${rest}`;
    return url.toString();
  } catch {
    return raw;
  }
}

export function productShareImagePath(id: string): string {
  return `/api/share/product/${encodeURIComponent(id)}`;
}

export function productShareDetails(product: ShareableProduct, origin?: string) {
  const title = (product.title || 'Verndly').trim();
  const store =
    product.seller?.store_name?.trim() ||
    product.storeName?.trim() ||
    product.seller?.store_link?.trim() ||
    product.storeLink?.trim() ||
    '';
  const path = getProductPath(product);
  const base = (origin || '').replace(/\/$/, '');
  const url = base ? `${base}${path}` : path;
  const caption = [title, store, url].filter(Boolean).join('\n');
  return {
    title,
    store,
    path,
    url,
    caption,
    imagePath: productShareImagePath(String(product.id)),
  };
}

function shareNavigator():
  | (Navigator & {
      canShare?: (data?: ShareDataWithFiles) => boolean;
      share: (data?: ShareDataWithFiles) => Promise<void>;
    })
  | null {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return null;
  return navigator;
}

function fileExtension(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

function safeFileName(title: string, ext: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[^\w\s-]+/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48);
  return `${base || 'verndly-product'}.${ext}`;
}

/**
 * Share the product photo with its title.
 * `files` + `url` together is dropped by iOS, so the link lives in the caption.
 */
export async function shareProduct(product: ShareableProduct): Promise<ProductShareResult> {
  const nav = shareNavigator();
  if (!nav || typeof window === 'undefined') return 'unavailable';

  const { title, url, caption, imagePath } = productShareDetails(product, window.location.origin);

  try {
    const res = await fetch(imagePath);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        const type = blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
        const file = new File([blob], safeFileName(title, fileExtension(type)), { type });
        const withImage: ShareDataWithFiles = { files: [file], title, text: caption };
        if (!nav.canShare || nav.canShare(withImage)) {
          await nav.share(withImage);
          return 'shared';
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
  }

  try {
    await nav.share({ title, text: title, url });
    return 'shared';
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'unavailable';
  }
}
