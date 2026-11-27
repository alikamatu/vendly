import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
      return {
        store_profile_completed: false,
        location_set: false,
        payment_setup_completed: false,
        onboarding_completed: false,
        current_data: {
          bio: null,
          whatsapp_number: null,
          business_hours: null,
          delivery_policies: null,
          location_id: null,
          location: null,
          area: null,
          service_area: null,
          avg_delivery_time: null,
          accepted_payment_methods: [],
          payment_timing: null,
          payout_ready: false,
        },
      };
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

    if (dto.skip_payout) {
      if (store.is_seller_verified) {
        throw new BadRequestException(
          'Verified stores must complete payout details to receive orders.',
        );
      }

      await this.prisma.sellerProfile.update({
        where: { user_id: userId },
        data: {
          ...(dto.accepted_payment_methods &&
          dto.accepted_payment_methods.length > 0
            ? { accepted_payment_methods: dto.accepted_payment_methods }
            : {}),
          ...(dto.payment_timing ? { payment_timing: dto.payment_timing } : {}),
          payment_setup_completed: true,
        },
      });

      await this.checkAndCompleteOnboarding(userId);

      return {
        message:
          'Payout setup skipped for now. You can add your payout details anytime in Settings.',
        payment_setup_completed: true,
        payout_ready: false,
      };
    }

    // Security guard: once onboarding is completed and payout details already exist,
    // any modification must go through the verified payout-change OTP/2FA flow.
    if (store.onboarding_completed && store.bank_code && store.account_number) {
      throw new ForbiddenException(
        'Payout details are already configured. To change your bank or Mobile Money account, please use the verified payout update flow in Store Settings.',
      );
    }

    const cleanBankCode = (dto.bank_code || '').trim();
    const cleanAccountNumber = (dto.account_number || '')
      .replace(/[\s-]/g, '')
      .trim();

    if (!cleanBankCode || !cleanAccountNumber) {
      throw new BadRequestException(
        'Payout setup requires a valid bank/provider code and account or Mobile Money number.',
      );
    }

    if (!/^\d{9,16}$/.test(cleanAccountNumber)) {
      throw new BadRequestException(
        'Account or Mobile Money number must contain 9 to 16 digits.',
      );
    }

    const prevBank = {
      bank_name: store.bank_name,
      bank_code: store.bank_code,
      account_number: store.account_number,
    };

    await this.prisma.sellerProfile.update({
      where: { user_id: userId },
      data: {
        accepted_payment_methods: dto.accepted_payment_methods ?? [],
        payment_timing: dto.payment_timing,
        bank_name: (dto.bank_name || '').trim() || cleanBankCode,
        bank_code: cleanBankCode,
        account_number: cleanAccountNumber,
      },
    });

    // Hard-coded synchronous Paystack Subaccount provisioning during onboarding
    // with strict validation error handling and retry fallback for transient outages.
    let subaccountResult: {
      ok: boolean;
      subaccount_code: string | null;
      action: string;
      error?: string;
    };
    try {
      subaccountResult = await this.paymentsService.createSubaccount(store.id, {
        forceUpdate: true,
        throwOnError: true,
      });
    } catch (err) {
      // Revert invalid payout details so the store is never left with broken bank info
      await this.prisma.sellerProfile.update({
        where: { user_id: userId },
        data: prevBank,
      });
      throw err;
    }

    await this.prisma.sellerProfile.update({
      where: { user_id: userId },
      data: { payment_setup_completed: true },
    });

    await this.checkAndCompleteOnboarding(userId);

    return {
      message: subaccountResult.ok
        ? 'Payment setup completed and Paystack subaccount activated.'
        : 'Payment details saved. Paystack subaccount creation is queued for automatic retry.',
      payment_setup_completed: true,
      payout_ready: Boolean(
        subaccountResult.ok && subaccountResult.subaccount_code,
      ),
      subaccount_code: subaccountResult.subaccount_code,
      subaccount_status: subaccountResult.ok ? 'ACTIVE' : 'PENDING_RETRY',
      subaccount_warning: subaccountResult.ok
        ? null
        : subaccountResult.error || null,
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
