/**
 * Vendly Admin Operations Types
 * Unified TypeScript definitions for managing the entire Vendly platform.
 */

// ─── User & Verification Types ──────────────────────────────────────────

export type UserRole = 'USER' | 'SELLER' | 'ADMIN';

export interface VendlyUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  is_suspended: boolean;
  warnings: number;
  created_at: string;
  updated_at?: string;
  totp_enabled?: boolean;
  totp_method?: 'TOTP' | 'SMS';
  phone_e164?: string | null;
  phone_verified_at?: string | null;
  oauth_provider?: string | null;
  avatar_url?: string | null;
  is_pro?: boolean;
  pro_expires_at?: string | null;
  terms_accepted_at?: string | null;
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

// ─── Order & Transaction Types ──────────────────────────────────────────

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

// ─── Product & Catalog Types ─────────────────────────────────────────────

export type ProductStatus = 'draft' | 'active' | 'archived' | 'rejected';

export interface VendlyProduct {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: string | number;
  original_price?: string | number | null;
  currency: string;
  condition: string;
  quantity_available: number;
  status: ProductStatus | string;
  is_featured: boolean;
  views_count: number;
  category: string;
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
  };
}

export interface ProductListParams {
  status?: string;
  category?: string;
  seller_id?: string;
  search?: string;
  is_featured?: boolean;
  page?: number;
  limit?: number;
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

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

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

export interface UpdateBrandInput extends Partial<CreateBrandInput> {}

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

// ─── Return & Dispute Types ─────────────────────────────────────────────

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

// ─── Review Types ───────────────────────────────────────────────────────

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

// ─── Audit Log Types ────────────────────────────────────────────────────

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

// ─── Notification Types ─────────────────────────────────────────────────

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

export interface DirectNotificationInput {
  userId: string;
  title: string;
  body: string;
  link?: string;
}

// ─── Payout Types ───────────────────────────────────────────────────────

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

// ─── Promotion Payment Types ────────────────────────────────────────────

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

// ─── Enhanced Transaction Types ─────────────────────────────────────────

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

// ─── Overview & Platform Settings ───────────────────────────────────────

export interface GlobalOverviewStats {
  revenue?: number | string;
  gmv?: number | string;
  sellerCount?: number | string;
  orderCount?: number | string;
  productCount?: number | string;
  pendingApprovalsCount?: number;
  pendingReturnsCount?: number;
  flaggedReviewsCount?: number;
  users?: {
    total?: number;
    user?: number;
    seller?: number;
    admin?: number;
  };
}

export interface PlatformSettings {
  platform_fee_percent: number;
  escrow_release_days: number;
  min_payout_amount: number;
  maintenance_mode: boolean;
  support_email: string;
  support_phone?: string;
}
