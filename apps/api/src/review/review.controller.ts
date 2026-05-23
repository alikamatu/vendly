import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { FlagReviewDto } from './dto/flag-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  // ── Public reads ────────────────────────────────────────────

  @Get('product/:productId')
  listForProduct(
    @Param('productId') productId: string,
    @Query() query: ListReviewsDto,
  ) {
    return this.service.listForProduct(productId, query);
  }

  @Get('product/:productId/summary')
  summaryForProduct(@Param('productId') productId: string) {
    return this.service.summaryForProduct(productId);
  }

  @Get('store/:storeLink')
  listForStore(
    @Param('storeLink') storeLink: string,
    @Query() query: ListReviewsDto,
  ) {
    return this.service.listForSellerByStoreLink(storeLink, query);
  }

  @Get('store/:storeLink/summary')
  summaryForStore(@Param('storeLink') storeLink: string) {
    return this.service.summaryForSellerByStoreLink(storeLink);
  }

  // ── Buyer-authenticated ─────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('me/eligible')
  myEligible(@Request() req: { user: { id: string } }) {
    return this.service.eligibleForBuyer(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/written')
  myWritten(@Request() req: { user: { id: string } }) {
    return this.service.mineWritten(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReviewDto,
  ) {
    return this.service.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  // ── Seller-authenticated (verified inside the service) ──────

  @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  reply(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.service.sellerReply(req.user.id, id, dto.reply);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/reply')
  removeReply(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.service.removeSellerReply(req.user.id, id);
  }

  // ── Flag (any authenticated user) ───────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(':id/flag')
  flag(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: FlagReviewDto,
  ) {
    return this.service.flag(req.user.id, id, dto.reason, dto.notes);
  }
}
