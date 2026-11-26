import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { ReportService } from './report.service';
import { AdminReportController, ReportController } from './report.controller';

@Module({
  imports: [PrismaModule, AuditModule, NotificationModule],
  controllers: [ReportController, AdminReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
