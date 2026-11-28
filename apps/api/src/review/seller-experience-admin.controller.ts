import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { ModerateSellerExperienceDto } from './dto/seller-experience.dto';
import { SellerExperienceService } from './seller-experience.service';

@Controller('admin/seller-experience')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SellerExperienceAdminController {
  constructor(private readonly service: SellerExperienceService) {}

  @Get()
  list() {
    return this.service.listForAdmin();
  }

  @Patch(':id')
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateSellerExperienceDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.moderate(id, dto.status, req.user.id);
  }
}
