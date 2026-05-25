import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { AuditLogService } from './audit-log.service';

/**
 * Audit log read API.
 *
 *   GET /audit-logs           — admin: any filter. seller: scoped to self.
 *   GET /audit-logs/me        — current user's own actions (any role).
 *
 * Writes are not exposed; only server-side services may insert rows via
 * AuditLogService.record().
 */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLogs: AuditLogService) {}

  @Get()
  @Roles('ADMIN', 'SELLER')
  async list(
    @Req() req: any,
    @Query('actorId') actorId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const role: Role = req.user.role;

    // Sellers can only see audit rows tied to themselves: either they were
    // the actor, or they were the subject (entity_type=user, entity_id=me).
    // Easiest enforcement: force actor_id to the caller's id and reject any
    // attempt to scope to someone else's actor_id.
    if (role !== 'ADMIN') {
      if (actorId && actorId !== req.user.id) {
        throw new ForbiddenException(
          'Non-admins can only read their own audit log',
        );
      }
      actorId = req.user.id;
    }

    return this.auditLogs.list({
      actorId,
      entityType,
      entityId,
      action,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('me')
  @Roles('ADMIN', 'SELLER', 'USER')
  async listMine(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogs.list({
      actorId: req.user.id,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
