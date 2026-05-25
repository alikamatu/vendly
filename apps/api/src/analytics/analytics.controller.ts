import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { AnalyticsService, Range } from './analytics.service';

/**
 * Seller analytics surface.
 *
 *   GET /seller/analytics/overview?range=30d
 *   GET /seller/analytics/revenue-series?range=30d
 *   GET /seller/analytics/top-products?range=30d&sort=units|revenue|views&limit=10
 *   GET /seller/analytics/funnel?range=30d
 *
 * Every endpoint pulls the seller_id from the JWT — controllers never
 * accept seller_id in the query string, so a seller can't probe another
 * seller's numbers by tampering with params.
 */
const ALLOWED_RANGES: Range[] = ['7d', '30d', '90d', '12mo'];
function parseRange(input: string | undefined): Range {
  const r = (input || '30d') as Range;
  return ALLOWED_RANGES.includes(r) ? r : '30d';
}

@Controller('seller/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@Req() req: any, @Query('range') range?: string) {
    return this.analytics.overview(req.user.id, parseRange(range));
  }

  @Get('revenue-series')
  revenueSeries(@Req() req: any, @Query('range') range?: string) {
    return this.analytics.revenueSeries(req.user.id, parseRange(range));
  }

  @Get('top-products')
  topProducts(
    @Req() req: any,
    @Query('range') range?: string,
    @Query('sort') sort?: 'units' | 'revenue' | 'views',
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? Math.min(50, Math.max(1, Number(limit))) : 10;
    const s = sort === 'revenue' || sort === 'views' ? sort : 'units';
    return this.analytics.topProducts(req.user.id, parseRange(range), s, lim);
  }

  @Get('funnel')
  funnel(@Req() req: any, @Query('range') range?: string) {
    return this.analytics.funnel(req.user.id, parseRange(range));
  }
}
