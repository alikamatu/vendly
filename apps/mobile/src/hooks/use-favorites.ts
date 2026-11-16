import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { favoriteApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export const favoriteKeys = {
  ids: ['favorites', 'ids'] as const,
  list: ['favorites', 'list'] as const,
};

/**
 * Favorite IDs are cached via React Query and toggled optimistically,
 * mirroring the web app's favorite-context behaviour.
 */
export function useFavorites() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: ids = [] } = useQuery({
    queryKey: favoriteKeys.ids,
    queryFn: favoriteApi.ids,
    enabled: isAuthenticated,
  });

  const mutation = useMutation({
    mutationFn: (productId: string) => favoriteApi.toggle(productId),
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: favoriteKeys.ids });
      const previous = qc.getQueryData<string[]>(favoriteKeys.ids) ?? [];
      qc.setQueryData<string[]>(
        favoriteKeys.ids,
        previous.includes(productId)
          ? previous.filter((id) => id !== productId)
          : [...previous, productId],
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(favoriteKeys.ids, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const isFavorite = useCallback((productId: string) => ids.includes(productId), [ids]);

  const toggle = useCallback(
    (productId: string) => {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      mutation.mutate(productId);
    },
    [isAuthenticated, mutation],
  );

  const idsWithSize = Object.assign([...ids], { size: ids.length }) as string[] & {
    size: number;
  };

  return { ids: idsWithSize, isFavorite, toggle };
}
