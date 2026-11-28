import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmitSellerExperienceDto } from './dto/seller-experience.dto';
import { SellerExperienceService } from './seller-experience.service';

@Controller('seller-experience')
export class SellerExperienceController {
  constructor(private readonly service: SellerExperienceService) {}

  @Get('public')
  listPublic() {
    return this.service.listPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get('prompt')
  prompt(@Request() req: { user: { id: string } }) {
    return this.service.promptFor(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('dismiss')
  dismiss(@Request() req: { user: { id: string } }) {
    return this.service.dismiss(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  submit(
    @Request() req: { user: { id: string } },
    @Body() dto: SubmitSellerExperienceDto,
  ) {
    return this.service.submit(req.user.id, dto);
  }
}
