import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':productId')
  toggleFavorite(@Request() req: any, @Param('productId') productId: string) {
    return this.favoriteService.toggleFavorite(
      req.user.id,
      productId,
    );
  }

  @Get()
  getFavorites(@Request() req: any) {
    return this.favoriteService.getFavorites(req.user.id);
  }

  @Get('ids')
  getFavoriteIds(@Request() req: any) {
    return this.favoriteService.getFavoriteIds(req.user.id);
  }
}
