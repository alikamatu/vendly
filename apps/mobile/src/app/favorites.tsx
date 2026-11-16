import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { MasonryGrid } from '@/components/masonry-grid';
import { RequireAuth } from '@/components/require-auth';
import { MasonrySkeleton } from '@/components/skeleton';
import { EmptyState, ErrorState, useThemeColors } from '@/components/ui';
import { favoriteKeys } from '@/hooks/use-favorites';
import { favoriteApi } from '@/lib/api';

function FavoritesList() {
  const colors = useThemeColors();
  const q = useQuery({ queryKey: favoriteKeys.list, queryFn: favoriteApi.list });

  if (q.isPending) {
    return (
      <ScrollView className="flex-1 bg-white dark:bg-neutral-950" contentContainerClassName="p-4">
        <MasonrySkeleton count={6} />
      </ScrollView>
    );
  }
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;

  const products = (q.data ?? []).filter((f) => f.product).map((f) => f.product);
  if (products.length === 0) {
    return (
      <EmptyState
        icon="heart-outline"
        title="Nothing saved yet"
        message="Tap the heart icon on any product to save it to your wishlist."
        action={{ title: 'Browse Marketplace', onPress: () => router.navigate('/explore') }}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="p-4 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={q.isRefetching}
          onRefresh={() => {
            void q.refetch();
          }}
          tintColor={colors.accent}
        />
      }
    >
      <MasonryGrid products={products} />
    </ScrollView>
  );
}

export default function FavoritesScreen() {
  return (
    <RequireAuth
      title="Save what you love"
      message="Sign in to keep a wishlist of products across all your devices."
    >
      <FavoritesList />
    </RequireAuth>
  );
}
