import { Module, Global } from '@nestjs/common';
import { OrderEventsService } from './order-events.service';

@Global()
@Module({
  providers: [OrderEventsService],
  exports: [OrderEventsService],
})
export class EventsModule {}
