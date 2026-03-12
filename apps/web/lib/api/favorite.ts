import { api } from './index';

export const favoriteApi = {
  toggleFavorite: async (productId: string) => {
    const response = await api.post(`/favorites/${productId}`);
    return response.data;
  },

  getFavorites: async (): Promise<any[]> => {
    const response = await api.get('/favorites');
    return response.data;
  },

  getFavoriteIds: async () => {
    const response = await api.get('/favorites/ids');
    return response.data;
  },
};
