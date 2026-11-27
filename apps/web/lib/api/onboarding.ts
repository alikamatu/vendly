import { api } from './index';

export type ServiceArea = 'SAME_CITY' | 'NEARBY_STATES' | 'NATIONWIDE';

export type DeliveryTime =
  | 'SAME_DAY'
  | 'NEXT_DAY'
  | 'TWO_TO_THREE_DAYS'
  | 'FOUR_TO_SEVEN_DAYS'
  | 'MORE_THAN_ONE_WEEK';

export interface OnboardingStatus {
  store_profile_completed: boolean;
  location_set: boolean;
  payment_setup_completed: boolean;
  onboarding_completed: boolean;
  current_data: {
    bio: string | null;
    whatsapp_number: string | null;
    business_hours: string | null;
    delivery_policies: string | null;
    location_id: string | null;
    location: { id: string; region: string; city: string } | null;
    area: string | null;
    service_area: ServiceArea | null;
    avg_delivery_time: DeliveryTime | null;
    accepted_payment_methods: string[];
    payment_timing: string | null;
  };
}

export interface LocationCity {
  id: string;
  city: string;
  slug: string;
}

export const onboardingApi = {
  async getOnboardingStatus(token: string): Promise<OnboardingStatus> {
    const res = await api.get<OnboardingStatus>('/onboarding/status', { token });
    return res.data;
  },

  async completeStoreProfile(
    token: string,
    data: {
      bio?: string;
      whatsapp_number?: string;
      business_hours?: string;
      delivery_policies?: string;
    },
  ) {
    const res = await api.patch<{ message: string; store_profile_completed: boolean }>(
      '/onboarding/store-profile',
      data,
      { token },
    );
    return res.data;
  },

  async completeLocation(
    token: string,
    data: {
      location_id: string;
      area?: string;
      latitude?: number;
      longitude?: number;
      service_area: ServiceArea;
      avg_delivery_time: DeliveryTime;
    },
  ) {
    const res = await api.patch<{ message: string; location_set: boolean }>(
      '/onboarding/location',
      data,
      { token },
    );
    return res.data;
  },

  async completePayment(
    token: string,
    data: {
      skip_payout?: boolean;
      accepted_payment_methods?: string[];
      payment_timing?: string;
      bank_name?: string;
      bank_code?: string;
      account_number?: string;
    },
  ) {
    const res = await api.patch<{
      message: string;
      payment_setup_completed: boolean;
      payout_ready?: boolean;
      subaccount_code?: string | null;
      subaccount_status?: 'ACTIVE' | 'PENDING_RETRY';
      subaccount_warning?: string | null;
    }>('/onboarding/payment', data, { token });
    return res.data;
  },

  async getRegions(): Promise<string[]> {
    const res = await api.get<string[]>('/locations/regions');
    return res.data;
  },

  async getCitiesByRegion(region: string): Promise<LocationCity[]> {
    const res = await api.get<LocationCity[]>(`/locations/cities/${encodeURIComponent(region)}`);
    return res.data;
  },
};
