'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';

export interface OrderRealtimeEvent {
  type:
    | 'order.created'
    | 'order.paid'
    | 'order.status_updated'
    | 'order.cancelled'
    | 'order.return_requested'
    | 'order.return_updated';
  orderId: string;
  orderNumber: string;
  status: string;
  buyerId: string;
  sellerUserIds: string[];
  total: string;
  customerName?: string;
  reference?: string;
  timestamp: string;
}

interface UseRealtimeOrdersOptions {
  onOrderEvent?: (event: OrderRealtimeEvent) => void;
  showToasts?: boolean;
}

export function useRealtimeOrders(options: UseRealtimeOrdersOptions = {}) {
  const { user, token } = useAuth();
  const onOrderEventRef = useRef(options.onOrderEvent);
  onOrderEventRef.current = options.onOrderEvent;

  const showToasts = options.showToasts ?? true;

  useEffect(() => {
    if (!token || !user) return;

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';
    const streamUrl = `${apiUrl}/orders/stream?token=${encodeURIComponent(token)}`;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    function connect() {
      if (!isMounted) return;
      try {
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
          // Connected cleanly
        };

        eventSource.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            const event: OrderRealtimeEvent = payload.data || payload;

            if (event && event.type) {
              // Trigger consumer callback
              if (onOrderEventRef.current) {
                onOrderEventRef.current(event);
              }

              // Display calm, emoji-free notification
              if (showToasts) {
                switch (event.type) {
                  case 'order.created':
                    if (user?.role === 'SELLER') {
                      toast.info(`New order #${event.orderNumber}`, {
                        description: `${event.customerName || 'A customer'} placed an order (GH¢ ${event.total}).`,
                      });
                    } else {
                      toast.info(`Order #${event.orderNumber} initiated`, {
                        description: `Order total: GH¢ ${event.total}.`,
                      });
                    }
                    break;
                  case 'order.paid':
                    toast.success(`Payment verified: Order #${event.orderNumber}`, {
                      description: `Payment for GH¢ ${event.total} was verified successfully.`,
                    });
                    break;
                  case 'order.status_updated':
                    toast.info(`Order #${event.orderNumber} updated`, {
                      description: `Status changed to ${event.status.replace(/_/g, ' ')}.`,
                    });
                    break;
                  case 'order.cancelled':
                    toast.error(`Order #${event.orderNumber} cancelled`, {
                      description: 'This order has been marked as cancelled.',
                    });
                    break;
                  default:
                    break;
                }
              }
            }
          } catch (err) {
            console.error('Failed to parse SSE order event:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect after 5 seconds if still mounted
          if (isMounted) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch (err) {
        console.error('Failed to initialize EventSource for orders:', err);
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 7000);
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [token, user?.id, showToasts]);
}
