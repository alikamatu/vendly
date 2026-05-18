export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  product_title: string;
  product_image?: string;
};

export type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  total_amount: number;
  currency: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};

export type CreateOrderPayload = {
  seller_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
};
