import type { Prisma } from '@prisma/client';

/**
 * Shared public-visibility rule for products (T04; reused by T09 rails and T15 sitemap):
 * only approved/active listings from non-suspended stores are visible publicly.
 */
export const PUBLIC_PRODUCT_STATUSES = [
  'active',
  'published',
  'approved',
] as const;

export const PUBLIC_PRODUCT_STATUS_FILTER: Prisma.StringFilter = {
  in: [
    ...PUBLIC_PRODUCT_STATUSES,
    ...PUBLIC_PRODUCT_STATUSES.map((s) => s.toUpperCase()),
  ],
};

export const PUBLIC_PRODUCT_WHERE: Prisma.ProductWhereInput = {
  status: PUBLIC_PRODUCT_STATUS_FILTER,
  seller: {
    user: {
      is_suspended: false,
      disabled_at: null,
      deletion_scheduled_for: null,
    },
  },
};

export const PUBLIC_IN_STOCK_PRODUCT_WHERE: Prisma.ProductWhereInput = {
  ...PUBLIC_PRODUCT_WHERE,
  quantity_available: { gt: 0 },
};

export interface VisibilityCheckProduct {
  status?: string | null;
  quantity_available?: number | null;
  seller?: {
    user?: {
      is_suspended?: boolean | null;
      disabled_at?: Date | string | null;
      deletion_scheduled_for?: Date | string | null;
    } | null;
  } | null;
}

export function isPubliclyVisibleProduct(
  product?: VisibilityCheckProduct | null,
): boolean {
  if (!product) return false;
  const status = (product.status || '').trim().toLowerCase();
  if (!(PUBLIC_PRODUCT_STATUSES as readonly string[]).includes(status)) {
    return false;
  }
  const owner = product.seller?.user;
  if (
    owner?.is_suspended === true ||
    Boolean(owner?.disabled_at) ||
    Boolean(owner?.deletion_scheduled_for)
  ) {
    return false;
  }
  return true;
}

export function isPubliclyVisibleInStock(
  product?: VisibilityCheckProduct | null,
): boolean {
  if (!isPubliclyVisibleProduct(product)) return false;
  return typeof product?.quantity_available === 'number'
    ? product.quantity_available > 0
    : true;
}
