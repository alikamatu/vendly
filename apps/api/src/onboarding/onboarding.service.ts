import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CompleteStoreProfileDto } from './dto/complete-store-profile.dto';
import { CompleteLocationDto } from './dto/complete-location.dto';
import { CompletePaymentDto } from './dto/complete-payment.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  async getOnboardingStatus(userId: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
      include: {
        structured_location: true,
      },
    });

    if (!store) {
      throw new NotFoundException(
        'Store not found. Please create a store first.',
      );
    }

    return {
      store_profile_completed: store.store_profile_completed,
      location_set: store.location_set,
      payment_setup_completed: store.payment_setup_completed,
      onboarding_completed: store.onboarding_completed,
      // Return current data for pre-filling forms
      current_data: {
        bio: store.bio,
        whatsapp_number: store.whatsapp_number,
        business_hours: store.business_hours,
        delivery_policies: store.delivery_policies,
        location_id: store.location_id?.toString() || null,
        location: store.structured_location
          ? {
              id: store.structured_location.id.toString(),
              region: store.structured_location.region,
              city: store.structured_location.city,
            }
          : null,
        area: store.area,
        service_area: store.service_area,
        avg_delivery_time: store.avg_delivery_time,
        accepted_payment_methods: store.accepted_payment_methods,
        payment_timing: store.payment_timing,
        payout_ready: Boolean(
          store.bank_code &&
          store.account_number &&
          store.paystack_subaccount_code,
        ),
      },
    };
  }

  async completeStoreProfile(userId: string, dto: CompleteStoreProfileDto) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { user_id: userId },
      data: {
        bio: dto.bio ?? store.bio,
        whatsapp_number: dto.whatsapp_number ?? store.whatsapp_number,
        business_hours: dto.business_hours ?? store.business_hours,
        delivery_policies: dto.delivery_policies ?? store.delivery_policies,
        store_profile_completed: true,
      },
    });

    // Check if all steps complete
    await this.checkAndCompleteOnboarding(userId);

    return {
      message: 'Store profile step completed',
      store_profile_completed: true,
    };
  }

  async completeLocation(userId: string, dto: CompleteLocationDto) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Validate the location exists
    const location = await this.prisma.location.findUnique({
      where: { id: dto.location_id },
    });

    if (!location) {
      throw new BadRequestException('Invalid location selected');
    }

    await this.prisma.sellerProfile.update({
      where: { user_id: userId },
      data: {
        location_id: dto.location_id,
        location: `${location.city}, ${location.region}`, // also update legacy field
        area: dto.area || null,
        latitude: dto.latitude || null,
        longitude: dto.longitude || null,
        service_area: dto.service_area,
        avg_delivery_time: dto.avg_delivery_time,
        location_set: true,
      },
    });

    await this.checkAndCompleteOnboarding(userId);

    return {
      message: 'Location step completed',
      location_set: true,
    };
  }

  async completePayment(userId: string, dto: CompletePaymentDto) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (!dto.bank_code || !dto.account_number) {
      throw new BadRequestException(
        'Payout setup requires valid bank_code and account_number.',
      );
    }

    await this.prisma.sellerProfile.update({
      where: { user_id: userId },
      data: {
        accepted_payment_methods: dto.accepted_payment_methods,
        payment_timing: dto.payment_timing,
        bank_name: dto.bank_name,
        bank_code: dto.bank_code,
        account_number: dto.account_number,
        payment_setup_completed: true,
      },
    });

    await this.checkAndCompleteOnboarding(userId);

    // Trigger Paystack Subaccount Creation in the background
    this.paymentsService.createSubaccount(store.id).catch((err) => {
      console.error('Failed to create subaccount during onboarding:', err);
    });

    return {
      message: 'Payment setup step completed',
      payment_setup_completed: true,
      payout_ready: Boolean(dto.bank_code && dto.account_number),
    };
  }

  private async checkAndCompleteOnboarding(userId: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (
      store &&
      store.store_profile_completed &&
      store.location_set &&
      store.payment_setup_completed &&
      !store.onboarding_completed
    ) {
      await this.prisma.sellerProfile.update({
        where: { user_id: userId },
        data: { onboarding_completed: true },
      });
    }
  }

  // ---------- Location Queries ----------

  async getRegions() {
    const regions = await this.prisma.location.findMany({
      select: { region: true },
      distinct: ['region'],
      orderBy: { region: 'asc' },
    });

    return regions.map((r) => r.region);
  }

  async getCitiesByRegion(region: string) {
    const cities = await this.prisma.location.findMany({
      where: { region },
      select: {
        id: true,
        city: true,
        slug: true,
      },
      orderBy: { city: 'asc' },
    });

    return cities.map((c) => ({
      id: c.id.toString(),
      city: c.city,
      slug: c.slug,
    }));
  }

  async getAllLocations() {
    const locations = await this.prisma.location.findMany({
      orderBy: [{ region: 'asc' }, { city: 'asc' }],
    });

    // Group by region
    const grouped: Record<
      string,
      { id: string; city: string; slug: string }[]
    > = {};
    for (const loc of locations) {
      if (!grouped[loc.region]) grouped[loc.region] = [];
      grouped[loc.region].push({
        id: loc.id.toString(),
        city: loc.city,
        slug: loc.slug,
      });
    }

    return grouped;
  }
}
