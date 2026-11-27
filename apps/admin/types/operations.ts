/**
 * Vendly Admin Operations Types
 * Unified TypeScript definitions for managing the entire Vendly platform.
 */

export type UserRole = 'USER' | 'SELLER' | 'ADMIN';

export interface VendorBalanceInfo {
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
}

export interface SellerProfileSummary {
  id: string;
  user_id?: string;
  store_name: string;
  store_link: string;
  logo_url?: string | null;
  bio?: string | null;
  whatsapp_number?: string | null;
  location?: string | null;
  area?: string | null;
  business_hours?: string | null;
  delivery_policies?: string | null;
  bank_name?: string | null;
  bank_code?: string | null;
  account_number?: string | null;
  paystack_subaccount_code?: string | null;
  onboarding_completed?: boolean;
  payment_timing?: string | null;
  service_area?: string | null;
  avg_delivery_time?: string | null;
  rating_avg?: number;
  rating_count?: number;
  products_count?: number;
  reports_count?: number;
  balance_snapshot?: VendorBalanceInfo | null;
}

export interface VendlyUser {
  id: string;
  full_name: string;
  email: string;
  school?: string | null;
  role: UserRole;
  is_verified: boolean;
  is_suspended: boolean;
  disabled_at?: string | null;
  deletion_requested_at?: string | null;
  deletion_scheduled_for?: string | null;
  warnings: number;
  created_at: string;
  updated_at?: string;
  verification_doc?: string | null;
  totp_enabled?: boolean;
  totp_method?: 'TOTP' | 'SMS';
  totp_verified_at?: string | null;
  phone_e164?: string | null;
  phone_verified_at?: string | null;
  oauth_provider?: string | null;
  avatar_url?: string | null;
  is_pro?: boolean;
  pro_expires_at?: string | null;
  terms_accepted_at?: string | null;
  orders_count?: number;
  reviews_count?: number;
  reports_filed_count?: number;
  seller_profile?: SellerProfileSummary | null;
  addresses?: Array<{
    id: string;
    label?: string | null;
    name: string;
    phone: string;
    street: string;
    city: string;
    region?: string | null;
    is_default: boolean;
  }>;
  admin_approvals?: Array<{
    id: string;
    status: VerificationStatus;
    type: VerificationType;
    verification_data?: string | null;
    reviewed_at?: string | null;
    created_at: string;
  }>;
}

export interface AdminUsersSummary {
  totalUsers: number;
  buyers: number;
  sellers: number;
  admins: number;
  verified: number;
  suspended: number;
  disabled: number;
  deleting: number;
  totalStores: number;
}

export interface AdminStoreSummary {
  id: string;
  user_id: string;
  store_name: string;
  store_link: string;
  logo_url?: string | null;
  bio?: string | null;
  whatsapp_number?: string | null;
  location?: string | null;
  area?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  paystack_subaccount_code?: string | null;
  onboarding_completed: boolean;
  payment_timing?: string | null;
  service_area?: string | null;
  avg_delivery_time?: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  products_count: number;
  payouts_count: number;
  reviews_count: number;
  reports_count: number;
  balance_snapshot?: VendorBalanceInfo | null;
  owner: VendlyUser;
}

export interface AdminUserDetail {
  user: VendlyUser;
  stats: {
    productCount: number;
    totalOrders: number;
    totalSales: number;
    recentOrders: Array<{
      id: string;
      product: string;
      amount: number;
      date: string;
      status: string;
    }>;
  } | null;
  buyerStats: {
    totalOrders: number;
    totalSpent: number;
    recentOrders: Array<{
      id: string;
      total_amount: number;
      status: string;
      delivery_method?: string | null;
      created_at: string;
      items_summary: string;
    }>;
  };
  products: Array<{
    id: string;
    title: string;
    price: number;
    currency: string;
    status: string;
    quantity_available: number;
    category: string;
    views_count: number;
    image_urls: string[];
    created_at: string;
  }>;
  reportsFiled: Array<{
    id: string;
    target_type: string;
    reason: string;
    status: string;
    created_at: string;
  }>;
  reportsReceived: Array<{
    id: string;
    target_type: string;
    reason: string;
    status: string;
    resolution_action?: string | null;
    created_at: string;
  }>;
}

export type VerificationType = 'URL' | 'FILES' | 'CONTACT';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VerificationRequest {
  id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    school?: string;
    verification_doc?: string;
    created_at: string;
  };
  status: VerificationStatus;
  type: VerificationType;
  verification_data?: string;
  reviewed_by?: {
    id: string;
    full_name: string;
  };
  reviewed_at?: string;
  created_at: string;
}

export const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: string | number;
  product?: {
    id: string;
    title: string;
    image_urls?: string[];
    seller?: { store_name: string; store_link?: string } | null;
  };
}

export interface OrderTransaction {
  id: string;
  reference: string;
  amount: string | number;
  status: string;
  provider: string;
  provider_ref?: string | null;
  created_at: string;
}

export interface VendlyOrder {
  id: string;
  buyer_id: string;
  buyer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  total_amount: string | number;
  status: OrderStatus | string;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_location?: string | null;
  delivery_method?: string | null;
  delivery_notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  transaction?: OrderTransaction | null;
}

export interface OrderListParams {
  status?: string;
  buyer_id?: string;
  seller_id?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface OrderStatsSummary {
  totalOrders: number;
  totalRevenue: number;
  pending: number;
  byStatus: Record<string, number>;
}

export type ProductStatus = 'draft' | 'active' | 'archived' | 'rejected';

export interface AdminProductSummary {
  total: number;
  active: number;
  draft: number;
  archived: number;
  rejected: number;
  featured: number;
  out_of_stock: number;
  low_stock: number;
}

export interface VendlyProduct {
  id: string;
  seller_id: string;
  title: string;
  description?: string | null;
  price: string | number;
  original_price?: string | number | null;
  currency: string;
  condition: string;
  quantity_available: number;
  status: ProductStatus | string;
  is_featured: boolean;
  views_count: number;
  category: string;
  brand?: string | null;
  attributes?: Record<string, unknown>;
  image_urls: string[];
  video_url?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  seller?: {
    id?: string;
    store_name: string;
    store_link: string;
    logo_url?: string | null;
    is_seller_verified?: boolean;
    user?: {
      id: string;
      full_name: string;
      email: string;
    } | null;
  };
  _count?: {
    order_items: number;
    reviews: number;
    reports: number;
    favorited_by: number;
    variants: number;
  };
}

export interface ProductListParams {
  status?: string;
  category?: string;
  seller_id?: string;
  search?: string;
  stock?: 'in_stock' | 'out_of_stock' | 'low_stock' | '';
  sort?:
    | 'newest'
    | 'oldest'
    | 'price_asc'
    | 'price_desc'
    | 'views_desc'
    | 'stock_asc'
    | 'title_asc';
  is_featured?: boolean;
  min_discount?: number;
  page?: number;
  limit?: number;
}

export interface AdminProductWriteInput {
  seller_id?: string;
  title?: string;
  description?: string | null;
  price?: string;
  original_price?: string | null;
  currency?: string;
  condition?: string;
  quantity_available?: number;
  status?: ProductStatus | string;
  is_featured?: boolean;
  category?: string;
  brand?: string | null;
  attributes?: Record<string, unknown>;
  image_urls?: string[];
  video_url?: string | null;
  tags?: string[];
  reason?: string;
}

export interface CategoryField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required?: boolean;
  options?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  icon?: string | null;
  is_active?: boolean;
  fields?: CategoryField[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  image_url?: string;
  fields?: CategoryField[];
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface Brand {
  id: string;
  name: string;
  slug?: string;
  image_url?: string | null;
  logo_url?: string | null;
  description?: string | null;
  category_id: string;
  category?: {
    name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CreateBrandInput {
  name: string;
  category_id: string;
  image_url?: string;
}

export type UpdateBrandInput = Partial<CreateBrandInput>;

export interface NewsletterSubscriber {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface NewsletterStats {
  total: number;
  active: number;
  unsubscribed: number;
}

export type ReturnStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'ESCALATED'
  | 'REFUNDED';

export interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  details?: string | null;
  status: ReturnStatus;
  admin_note?: string | null;
  seller_response?: string | null;
  images?: string[];
  created_at: string;
  updated_at: string;
  order?: VendlyOrder | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  is_flagged: boolean;
  flag_reason?: string | null;
  is_hidden: boolean;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
  product?: {
    id: string;
    title: string;
  };
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_role: 'ADMIN' | 'SELLER' | 'USER' | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogListParams {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'ORDER_DELIVERED'
  | 'PAYMENT_RECEIVED'
  | 'PAYOUT_PROCESSED'
  | 'NEW_REVIEW'
  | 'REVIEW_FLAGGED'
  | 'RETURN_REQUESTED'
  | 'RETURN_UPDATED'
  | 'PRODUCT_APPROVED'
  | 'PRODUCT_REJECTED'
  | 'STORE_APPROVED'
  | 'STORE_REJECTED'
  | 'ADMIN_BROADCAST'
  | 'SYSTEM';

export interface AdminNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  user?: { id: string; full_name: string; email: string };
}

export interface NotificationStats {
  total: number;
  unread: number;
  last24h: number;
  byType: { type: NotificationType; count: number }[];
}

export interface BroadcastInput {
  title: string;
  body: string;
  link?: string;
  role?: 'USER' | 'SELLER' | 'ADMIN';
}

export type PayoutStatus = 'SUCCESS' | 'PENDING' | 'PROCESSING' | 'FAILED';
export type PayoutMode = 'AUTO' | 'MANUAL';

export interface VendlyPayout {
  id: string;
  reference: string;
  amount: string | number;
  gross_amount?: number;
  platform_fee?: number;
  status: PayoutStatus;
  mode?: PayoutMode;
  failure_reason?: string;
  metadata?: Record<string, any> | null;
  processed_at?: string;
  created_at: string;
  seller?: {
    store_name: string;
    bank_name?: string;
    account_number?: string;
    subaccount?: string;
  };
  transaction?: { reference: string };
}

export type PromotionCategory = 'BOOST' | 'PLAN';

export interface PromotionPayment {
  id: string;
  reference: string;
  amount: string | number;
  status: string;
  category: PromotionCategory;
  provider?: string;
  paid_at?: string;
  created_at: string;
  product?: {
    id: string;
    title: string;
  };
}

export interface EnhancedTransaction {
  id: string;
  reference: string;
  amount: string | number;
  gross_amount?: number;
  net_amount?: number;
  platform_fee?: number;
  status: string;
  provider: string;
  provider_ref?: string | null;
  created_at: string;
  order_id?: string;
  payer?: {
    name: string;
    phone?: string;
  };
  receiver?: {
    store_name: string;
    subaccount?: string;
  };
  payout?: {
    status: string;
  };
}

export interface GlobalOverviewStats {
  revenue?: number | string;
  gmv?: number | string;
  sellerCount?: number | string;
  orderCount?: number | string;
  productCount?: number | string;
  pendingApprovalsCount?: number;
  pendingReturnsCount?: number;
  flaggedReviewsCount?: number;
  openReportsCount?: number;
  users?: {
    total?: number;
    user?: number;
    seller?: number;
    admin?: number;
  };
}

export type ReportTargetType = 'PRODUCT' | 'SELLER';

export type ReportReason =
  | 'COUNTERFEIT'
  | 'MISLEADING'
  | 'PROHIBITED_ITEM'
  | 'SCAM_FRAUD'
  | 'HARASSMENT'
  | 'SPAM'
  | 'OFFENSIVE_CONTENT'
  | 'INACCURATE_PRICING'
  | 'OTHER';

export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export type ReportResolutionAction =
  | 'NONE'
  | 'WARNING_ISSUED'
  | 'PRODUCT_REJECTED'
  | 'PRODUCT_ARCHIVED'
  | 'SELLER_SUSPENDED'
  | 'DISMISSED';

export interface AdminReport {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  product_id?: string | null;
  seller_id?: string | null;
  reason: ReportReason;
  details?: string | null;
  evidence_urls: string[];
  status: ReportStatus;
  resolution_action?: ReportResolutionAction | null;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  reporter?: {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
  } | null;
  reviewer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  product?: {
    id: string;
    title: string;
    price: string | number;
    currency: string;
    status: string;
    category: string;
    image_urls: string[];
    seller_id: string;
    seller?: {
      id: string;
      store_name: string;
      store_link: string;
      user_id: string;
      user?: {
        id: string;
        full_name: string;
        email: string;
        is_suspended: boolean;
        warnings: number;
      } | null;
    } | null;
  } | null;
  seller?: {
    id: string;
    store_name: string;
    store_link: string;
    logo_url?: string | null;
    location?: string | null;
    user_id: string;
    user?: {
      id: string;
      full_name: string;
      email: string;
      is_suspended: boolean;
      warnings: number;
    } | null;
  } | null;
  related_counts?: {
    product_reports: number;
    seller_reports: number;
  };
}

export interface ReportStats {
  open: number;
  under_review: number;
  resolved: number;
  dismissed: number;
  active_product_reports: number;
  active_seller_reports: number;
}

export interface PlatformSettings {
  platform_fee_percent: number;
  escrow_release_days: number;
  min_payout_amount: number;
  maintenance_mode: boolean;
  support_email: string;
  support_phone?: string;
}
