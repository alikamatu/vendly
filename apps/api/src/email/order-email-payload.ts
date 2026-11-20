import type { OrderEmailData, OrderStatusEmailData } from './email-templates';

export interface OrderEmailItemSource {
  quantity: number;
  price: { toString(): string };
  product?: {
    title?: string | null;
    image_urls?: Array<string | null> | null;
    seller?: {
      store_name?: string | null;
      store_link?: string | null;
      user?: { email?: string | null } | null;
    } | null;
  } | null;
  variant?: {
    image_url?: string | null;
    attributes?: unknown;
  } | null;
}

export interface OrderEmailSource {
  id: string | { toString(): string };
  created_at: string | Date;
  status?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_method?: string | null;
  delivery_location?: string | null;
  delivery_notes?: string | null;
  total_amount: { toString(): string };
  buyer?: { full_name?: string | null; email?: string | null } | null;
  transaction?: {
    status?: string | null;
    provider?: string | null;
    reference?: string | null;
    id?: string;
  } | null;
  items: OrderEmailItemSource[];
}

export interface OrderEmailPayloadOptions {
  itemTitleFallback?: string;
  buyerStoreFallback?: string;
  sellerStoreFallback?: string;
  paymentMethod?: string;
  isPaid?: boolean;
  /** `null` omits currency. Omitted means `GHS`. */
  currency?: string | null;
  status?: string;
  reason?: string | null;
  cancelledBy?: 'buyer' | 'seller' | 'admin';
}

export interface SellerOrderEmail {
  email: string;
  order: OrderEmailData;
}

export interface OrderEmailPayloads {
  orderNumber: string;
  customerName: string;
  buyerOrder: OrderEmailData;
  sellerOrders: SellerOrderEmail[];
  statusOrder: OrderStatusEmailData;
  sellerEmails: string[];
}

function variantValueText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (value == null) return '';
  if (value instanceof Date) return value.toString();
  if (Array.isArray(value)) {
    return value.map((item) => variantValueText(item)).join(',');
  }
  return '[object Object]';
}

function formatVariantDesc(
  variant: OrderEmailItemSource['variant'],
): string | null {
  if (!variant || variant.attributes == null || variant.attributes === '') {
    return null;
  }
  let attrs: unknown = variant.attributes;
  if (typeof attrs === 'string') {
    try {
      attrs = JSON.parse(attrs) as unknown;
    } catch {
      return null;
    }
  }
  if (!attrs || typeof attrs !== 'object') return null;
  const entries = Object.entries(attrs as Record<string, unknown>).filter(
    ([, value]) => value != null && variantValueText(value).trim() !== '',
  );
  if (entries.length === 0) return null;
  return entries
    .map(([key, value]) => `${key}: ${variantValueText(value)}`)
    .join(' • ');
}

function mapItem(item: OrderEmailItemSource, titleFallback: string) {
  return {
    title: item.product?.title || titleFallback,
    quantity: item.quantity,
    price: item.price.toString(),
    image_url: item.variant?.image_url || item.product?.image_urls?.[0] || null,
    variantDescription: formatVariantDesc(item.variant),
  };
}

export function buildOrderEmailPayloads(
  order: OrderEmailSource,
  options: OrderEmailPayloadOptions = {},
): OrderEmailPayloads {
  const itemTitleFallback = options.itemTitleFallback ?? 'Product';
  const buyerStoreFallback = options.buyerStoreFallback ?? 'Verndly Store';
  const sellerStoreFallback = options.sellerStoreFallback ?? 'Your Store';
  const currency =
    options.currency === null ? undefined : (options.currency ?? 'GHS');
  const isPaid =
    options.isPaid ??
    (order.transaction?.status === 'SUCCESS' || order.status === 'PAID');
  const paymentMethod =
    options.paymentMethod ??
    (order.transaction?.provider === 'PAYSTACK'
      ? 'Paystack (Paid Online)'
      : 'Cash on Delivery (Pay on Delivery)');

  const orderNumber = `ORD-${String(order.id).slice(-6).toUpperCase()}`;
  const customerName =
    order.customer_name || order.buyer?.full_name || 'Customer';
  const items = order.items.map((item) => mapItem(item, itemTitleFallback));
  const firstSeller = order.items[0]?.product?.seller;

  const buyerOrder: OrderEmailData = {
    orderNumber,
    date: order.created_at,
    customerName,
    customerEmail: order.buyer?.email ?? undefined,
    customerPhone: order.customer_phone || undefined,
    deliveryMethod: order.delivery_method || undefined,
    deliveryLocation: order.delivery_location || undefined,
    deliveryNotes: order.delivery_notes || undefined,
    storeName: firstSeller?.store_name || buyerStoreFallback,
    storeLink: firstSeller?.store_link || undefined,
    items,
    subtotal: order.total_amount.toString(),
    total: order.total_amount.toString(),
    ...(currency !== undefined ? { currency } : {}),
    paymentMethod,
    paymentReference: order.transaction?.reference || undefined,
    isPaid,
  };

  const sellerGroups = new Map<
    string,
    {
      email: string;
      storeName: string;
      storeLink?: string | null;
      items: typeof items;
    }
  >();

  for (const item of order.items) {
    const seller = item.product?.seller;
    const email = seller?.user?.email;
    if (!email) continue;
    let group = sellerGroups.get(email);
    if (!group) {
      group = {
        email,
        storeName: seller?.store_name || sellerStoreFallback,
        storeLink: seller?.store_link,
        items: [],
      };
      sellerGroups.set(email, group);
    }
    group.items.push(mapItem(item, itemTitleFallback));
  }

  const sellerOrders = [...sellerGroups.values()].map((group) => {
    const sellerTotal = group.items.reduce(
      (sum, it) => sum + Number(it.price) * it.quantity,
      0,
    );
    return {
      email: group.email,
      order: {
        ...buyerOrder,
        storeName: group.storeName,
        storeLink: group.storeLink ?? undefined,
        items: group.items,
        subtotal: sellerTotal.toFixed(2),
        total: sellerTotal.toFixed(2),
      },
    };
  });

  const sellerEmails = [
    ...new Set(
      order.items
        .map((item) => item.product?.seller?.user?.email)
        .filter((email): email is string => Boolean(email)),
    ),
  ];

  const statusOrder: OrderStatusEmailData = {
    orderNumber,
    date: order.created_at,
    customerName,
    customerPhone: order.customer_phone || undefined,
    storeName: firstSeller?.store_name || buyerStoreFallback,
    storeLink: firstSeller?.store_link || undefined,
    status: options.status ?? '',
    items,
    subtotal: order.total_amount.toString(),
    total: order.total_amount.toString(),
    ...(currency !== undefined ? { currency } : {}),
    deliveryMethod: order.delivery_method || undefined,
    deliveryLocation: order.delivery_location || undefined,
    deliveryNotes: order.delivery_notes || undefined,
    reason: options.reason ?? null,
    cancelledBy: options.cancelledBy,
  };

  return {
    orderNumber,
    customerName,
    buyerOrder,
    sellerOrders,
    statusOrder,
    sellerEmails,
  };
}
