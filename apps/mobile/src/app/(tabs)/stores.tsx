import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoreCardSkeleton, StoreListSkeleton } from '@/components/skeleton';
import { StoreCard } from '@/components/store-card';
import { EmptyState, ErrorState, useThemeColors } from '@/components/ui';
import { storeApi, type BrowseStoresParams } from '@/lib/api';

const PAGE_SIZE = 12;

type StoreSort = NonNullable<BrowseStoresParams['sort']>;

const SORTS: { key: StoreSort; label: string }[] = [
  { key: 'default', label: 'Featured' },
  { key: 'newest', label: 'Newest' },
  { key: 'products', label: 'Most Products' },
  { key: 'alphabetical', label: 'A → Z' },
];

export default function StoresScreen() {
  const colors = useThemeColors();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<StoreSort>('default');
  const [proOnly, setProOnly] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput.trim()), 280);
    return () => clearTimeout(id);
  }, [searchInput]);

  const storesQuery = useInfiniteQuery({
    queryKey: ['stores-directory', { search: debouncedSearch, sort, proOnly }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      storeApi.browse({
        page: pageParam,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        sort,
        is_pro: proOnly || undefined,
      }),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : null),
  });

  const stores = useMemo(
    () => storesQuery.data?.pages.flatMap((p) => p.stores ?? []) ?? [],
    [storesQuery.data],
  );
  const totalStores = storesQuery.data?.pages[0]?.total ?? stores.length;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
      {/* Header matching apps/web/components/stores-browser/StoresBrowser.tsx */}
      <View className="border-border/70 dark:border-border-dark gap-2.5 border-b px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center gap-1.5">
              <View className="bg-accent h-1.5 w-1.5 rounded-full" />
              <Text className="text-accent text-[10px] font-medium uppercase tracking-widest">
                Verndly Directory
              </Text>
            </View>
            <Text className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Verified Entrepreneurs
            </Text>
          </View>
          <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark rounded-full border px-3 py-1.5">
            <Text className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
              {totalStores} {totalStores === 1 ? 'store' : 'stores'}
            </Text>
          </View>
        </View>

        {/* Search Input */}
        <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-2 rounded-2xl border px-3.5">
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search stores by name, handle, or location…"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            className="h-11 flex-1 text-sm text-neutral-900 dark:text-neutral-100"
          />
          {searchInput.length > 0 ? (
            <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Sort & Pro Toggle */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center gap-2"
        >
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                className={`rounded-full px-3.5 py-1.5 ${
                  active
                    ? 'bg-black dark:bg-white'
                    : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark border'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    active ? 'text-white dark:text-black' : 'text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => setProOnly((v) => !v)}
            className={`flex-row items-center gap-1 rounded-full px-3.5 py-1.5 ${
              proOnly
                ? 'bg-accent'
                : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark border'
            }`}
          >
            <Ionicons name="sparkles" size={12} color={proOnly ? '#fff' : colors.accent} />
            <Text
              className={`text-xs font-medium ${
                proOnly ? 'text-white' : 'text-neutral-800 dark:text-neutral-200'
              }`}
            >
              PRO Vendors Only
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {storesQuery.isPending ? (
        <ScrollView className="flex-1 bg-white dark:bg-neutral-950" scrollEnabled={false}>
          <StoreListSkeleton count={3} />
        </ScrollView>
      ) : storesQuery.isError ? (
        <ErrorState message={storesQuery.error.message} onRetry={() => storesQuery.refetch()} />
      ) : (
        <FlatList
          className="flex-1 bg-white dark:bg-neutral-950"
          data={stores}
          keyExtractor={(s) => s.id}
          contentContainerClassName="gap-4 p-4 pb-10"
          renderItem={({ item }) => <StoreCard store={item} />}
          refreshControl={
            <RefreshControl
              refreshing={storesQuery.isRefetching && !storesQuery.isFetchingNextPage}
              onRefresh={() => {
                void storesQuery.refetch();
              }}
              tintColor={colors.accent}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (storesQuery.hasNextPage && !storesQuery.isFetchingNextPage) {
              void storesQuery.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            <EmptyState
              icon="storefront-outline"
              title="No stores found"
              message="Try clearing your search or turning off the PRO filter."
              action={{
                title: 'Show all stores',
                onPress: () => {
                  setSearchInput('');
                  setProOnly(false);
                  setSort('default');
                },
              }}
            />
          }
          ListFooterComponent={
            storesQuery.isFetchingNextPage ? (
              <View className="py-4">
                <StoreCardSkeleton />
              </View>
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}
