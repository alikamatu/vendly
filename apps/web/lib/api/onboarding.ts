const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message || 'Something went wrong';
    throw new Error(msg);
  }
  const json = await response.json();
  return (json && typeof json === 'object' && 'data' in json) ? json.data : json;
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

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
    const res = await fetch(`${API_URL}/onboarding/status`, {
      method: 'GET',
      headers: authHeaders(token),
    });
    return handleResponse<OnboardingStatus>(res);
  },

  async completeStoreProfile(token: string, data: {
    bio?: string;
    whatsapp_number?: string;
    business_hours?: string;
    delivery_policies?: string;
  }) {
    const res = await fetch(`${API_URL}/onboarding/store-profile`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; store_profile_completed: boolean }>(res);
  },

  async completeLocation(token: string, data: {
    location_id: string;
    area?: string;
    latitude?: number;
    longitude?: number;
    service_area: ServiceArea;
    avg_delivery_time: DeliveryTime;
  }) {
    const res = await fetch(`${API_URL}/onboarding/location`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; location_set: boolean }>(res);
  },

  async completePayment(token: string, data: {
    accepted_payment_methods: string[];
    payment_timing: string;
    bank_name: string;
    bank_code: string;
    account_number: string;
  }) {
    const res = await fetch(`${API_URL}/onboarding/payment`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; payment_setup_completed: boolean }>(res);
  },

  async getRegions(): Promise<string[]> {
    const res = await fetch(`${API_URL}/locations/regions`);
    return handleResponse<string[]>(res);
  },

  async getCitiesByRegion(region: string): Promise<LocationCity[]> {
    const res = await fetch(`${API_URL}/locations/cities/${encodeURIComponent(region)}`);
    return handleResponse<LocationCity[]>(res);
  },
};
