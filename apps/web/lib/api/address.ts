import { api } from './index';

export interface Address {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  street: string;
  city: string;
  region: string | null;
  is_default: boolean;
}

export const addressApi = {
  async getAddresses(token: string) {
    const res = await api.get<Address[]>('/address', { token });
    return res.data;
  },

  async createAddress(token: string, data: Omit<Address, 'id'>) {
    const res = await api.post<Address>('/address', data, { token });
    return res.data;
  },

  async updateAddress(token: string, id: string, data: Partial<Omit<Address, 'id'>>) {
    const res = await api.patch<Address>(`/address/${id}`, data, { token });
    return res.data;
  },

  async deleteAddress(token: string, id: string) {
    const res = await api.delete<{ success: boolean }>(`/address/${id}`, { token });
    return res.data;
  },
};
