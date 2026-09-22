import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { NewsletterAdminController } from './newsletter-admin.controller';
import { ContactService } from './contact.service';
import { EmailModule } from '../email/email.module';
import { LoopsModule } from '../loops/loops.module';

@Module({
  imports: [EmailModule, LoopsModule],
  controllers: [ContactController, NewsletterAdminController],
  providers: [ContactService],
})
export class ContactModule {}
