import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CompleteStoreProfileDto } from './dto/complete-store-profile.dto';
import { CompleteLocationDto } from './dto/complete-location.dto';
import { CompletePaymentDto } from './dto/complete-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // ====== Onboarding Endpoints (protected) ======

  @Get('onboarding/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async getOnboardingStatus(@Request() req) {
    return this.onboardingService.getOnboardingStatus(req.user.id);
  }

  @Patch('onboarding/store-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async completeStoreProfile(
    @Request() req,
    @Body() dto: CompleteStoreProfileDto,
  ) {
    return this.onboardingService.completeStoreProfile(
      req.user.id,
      dto,
    );
  }

  @Patch('onboarding/location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async completeLocation(@Request() req, @Body() dto: CompleteLocationDto) {
    return this.onboardingService.completeLocation(req.user.id, dto);
  }

  @Patch('onboarding/payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async completePayment(@Request() req, @Body() dto: CompletePaymentDto) {
    return this.onboardingService.completePayment(req.user.id, dto);
  }

  // ====== Location Endpoints (public) ======

  @Get('locations')
  async getAllLocations() {
    return this.onboardingService.getAllLocations();
  }

  @Get('locations/regions')
  async getRegions() {
    return this.onboardingService.getRegions();
  }

  @Get('locations/cities/:region')
  async getCitiesByRegion(@Param('region') region: string) {
    return this.onboardingService.getCitiesByRegion(region);
  }
}
