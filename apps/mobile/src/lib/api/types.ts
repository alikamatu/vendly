/**
 * Response shapes for the endpoints the mobile app consumes. These mirror
 * what apps/web reads from the same endpoints (see apps/web/lib/api/*).
 */

export interface User {
  id: string;
  full_name: string;
  email: string;
  school?: string;
  role: string;
  is_verified: boolean;
  has_verification_doc?: boolean;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | string | null;
  phone_e164?: string | null;
  seller_profile?: {
    store_name?: string;
    store_link?: string;
    logo_url?: string | null;
  } | null;
  created_at?: string;
}

export interface LoginResponse {
  totp_required?: boolean;
  method?: 'TOTP' | 'SMS';
  phone_hint?: string | null;
  message?: string;
  access_token?: string;
  user?: User;
}

export interface SellerSummary {
  store_name: string;
  store_link: string;
  logo_url?: string | null;
  user_id?: string;
  whatsapp_number?: string | null;
  is_verified?: boolean;
  is_pro?: boolean;
}

export interface Product {
  id: string;
  title: string;
  description?: string | null;
  price: string | number;
  original_price?: string | number | null;
  currency: string;
  condition: string;
  quantity_available: number;
  status: string;
  is_featured: boolean;
  views_count?: number;
  category: string;
  brand?: string | null;
  image_urls: string[];
  video_url?: string | null;
  tags: string[];
  created_at: string;
  rating_avg?: number;
  rating_count?: number;
  seller: SellerSummary;
}

export interface ProductVariant {
  id: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  quantity_available: number;
  image_url?: string | null;
  is_active: boolean;
}

export interface ProductDetail extends Product {
  variants?: ProductVariant[];
  attributes?: Record<string, unknown> | null;
}

export type BrowseSort =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'discount_desc';

export type ProductSort = BrowseSort;
export type ProductCondition = 'new' | 'used' | 'refurbished' | string;

export interface BrowseProductsParams {
  search?: string;
  category?: string;
  brand?: string;
  min_price?: number;
  max_price?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  has_video?: boolean;
  in_stock?: boolean;
  inStock?: boolean;
  hasDiscount?: boolean;
  is_featured?: boolean;
  min_discount?: number;
  sort?: BrowseSort;
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface Category {
  id: string;
  name: string;
  category: string;
  count: number;
  description?: string | null;
  image_url?: string | null;
  fields?: unknown[];
}

export interface Brand {
  id: string;
  name: string;
  brand: string;
  count: number;
  image_url?: string | null;
  category_id?: string;
}

export interface ShowcaseProduct {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
}

export interface BrowseStore {
  id: string;
  store_name: string;
  store_link: string;
  logo_url: string | null;
  banner_url?: string | null;
  bio: string | null;
  location: string | null;
  area: string | null;
  products_count: number;
  is_pro: boolean;
  is_verified: boolean;
  products: ShowcaseProduct[];
  previewProducts?: Product[];
}

export interface BrowseStoresParams {
  search?: string;
  location?: string;
  is_pro?: boolean;
  isPro?: boolean;
  sort?: 'newest' | 'products' | 'alphabetical' | 'default';
  page?: number;
  limit?: number;
}

export interface BrowseStoresResponse {
  stores: BrowseStore[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type StoreSort = NonNullable<BrowseStoresParams['sort']>;

export interface TopProVendor {
  id: string;
  store_name: string;
  store_link: string;
  logo_url: string | null;
  banner_url?: string | null;
  bio: string | null;
  location: string | null;
  area?: string | null;
  products_count: number;
  is_pro: boolean;
  is_verified?: boolean;
  products?: ShowcaseProduct[];
  previewProducts?: Product[];
}

export type PublicStore = BrowseStore | TopProVendor;

export interface StoreDetail {
  id: string;
  store_name: string;
  store_link: string;
  logo_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  whatsapp_number?: string | null;
  location?: string | null;
  area?: string | null;
  delivery_policies?: string | null;
  business_hours?: string | null;
  typical_dispatch_hours?: number | null;
  social_links?: Record<string, string> | null;
  payment_timing?: 'BOTH' | 'UPFRONT_ONLY' | 'DELIVERY_ONLY';
  accepted_payment_methods?: string[];
  service_area?: 'SAME_CITY' | 'NEARBY_STATES' | 'NATIONWIDE' | null;
  avg_delivery_time?:
    | 'SAME_DAY'
    | 'NEXT_DAY'
    | 'TWO_TO_THREE_DAYS'
    | 'FOUR_TO_SEVEN_DAYS'
    | 'MORE_THAN_ONE_WEEK'
    | null;
  is_pro?: boolean;
  is_verified?: boolean;
  member_since?: string | null;
  created_at?: string | null;
  products_count?: number;
  rating_avg?: number;
  rating_count?: number;
  products?: Product[];
}

export interface Address {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  street: string;
  city: string;
  region: string | null;
  is_default: boolean;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: string | number;
  variant_id?: string | null;
  product?: {
    id: string;
    title: string;
    image_urls?: string[];
    video_url?: string | null;
    seller?: SellerSummary & { whatsapp_number?: string | null };
  };
}

export interface Transaction {
  reference: string;
  amount: string | number;
  status: string;
  provider: string;
}

export interface Order {
  id: string;
  status: string;
  total_amount: string | number;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_method?: 'PICKUP' | 'DELIVERY' | string | null;
  delivery_location?: string | null;
  delivery_notes?: string | null;
  transaction?: Transaction | null;
  items: OrderItem[];
}

export interface CreateOrderResult {
  id?: string;
  orderId?: string;
  total?: number | string;
  total_amount?: number | string;
  reference?: string;
  authorization_url?: string | null;
  access_code?: string | null;
}

export interface Favorite {
  id: string;
  product: Product;
}

export interface Review {
  id: string;
  product_id: string;
  seller_id: string;
  buyer_id: string;
  order_item_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  comment?: string | null;
  reviewer_name?: string | null;
  verified_purchase: boolean;
  is_verified_purchase?: boolean;
  helpful_count: number;
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
  buyer?: { id: string; full_name: string };
}

export interface ReviewList {
  items: Review[];
  reviews: Review[];
  total: number;
  nextCursor: number | null;
}

export interface ReviewSummary {
  count: number;
  average: number;
  totalReviews: number;
  averageRating: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  message?: string;
  link: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export type AppNotification = NotificationItem;

export interface NotificationPage {
  items: NotificationItem[];
  data: NotificationItem[];
  nextCursor: string | null;
}
