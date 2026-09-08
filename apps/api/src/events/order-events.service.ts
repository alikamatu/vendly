import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface OrderRealtimeEvent {
  type:
    | 'order.created'
    | 'order.paid'
    | 'order.status_updated'
    | 'order.cancelled'
    | 'order.refunded'
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

@Injectable()
export class OrderEventsService {
  private readonly logger = new Logger(OrderEventsService.name);
  private readonly eventSubject = new Subject<OrderRealtimeEvent>();

  emit(event: OrderRealtimeEvent) {
    this.logger.log(
      `Emitting real-time event [${event.type}] for order ${event.orderNumber} (status: ${event.status})`,
    );
    this.eventSubject.next(event);
  }

  /**
   * Returns a real-time event stream filtered for the given user.
   * - ADMIN: receives all order events across the marketplace.
   * - SELLER: receives events where their products are involved.
   * - BUYER: receives events where they are the buyer.
   */
  subscribeForUser(
    userId: string,
    role: 'ADMIN' | 'SELLER' | 'USER',
  ): Observable<{ data: OrderRealtimeEvent }> {
    return this.eventSubject.asObservable().pipe(
      filter((event) => {
        if (role === 'ADMIN') return true;
        if (event.buyerId === userId) return true;
        if (event.sellerUserIds.includes(userId)) return true;
        return false;
      }),
      map((event) => ({ data: event })),
    );
  }
}
