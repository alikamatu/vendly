import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MasonryGrid } from '@/components/masonry-grid';
import { MasonrySkeleton } from '@/components/skeleton';
import { Button, EmptyState, ErrorState, useThemeColors } from '@/components/ui';
import { productApi, type ProductCondition, type ProductSort } from '@/lib/api';

const PAGE_SIZE = 20;

const SORTS: { key: ProductSort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Popular' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'discount_desc', label: 'Biggest Discount' },
];

const CONDITIONS: { key: ProductCondition; label: string }[] = [
  { key: 'new', label: 'Brand New' },
  { key: 'used', label: 'Pre-owned / Used' },
  { key: 'refurbished', label: 'Refurbished' },
];

export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    category?: string;
    brand?: string;
    sort?: ProductSort;
    q?: string;
  }>();
  const colors = useThemeColors();
  const router = useRouter();

  const [searchInput, setSearchInput] = useState(params.q ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(params.q ?? '');
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [brand, setBrand] = useState<string | null>(params.brand ?? null);
  const [sort, setSort] = useState<ProductSort>(params.sort ?? 'newest');
  const [condition, setCondition] = useState<ProductCondition | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (params.category !== undefined) setCategory(params.category || null);
  }, [params.category]);

  useEffect(() => {
    if (params.brand !== undefined) setBrand(params.brand || null);
  }, [params.brand]);

  useEffect(() => {
    if (params.sort) setSort(params.sort);
  }, [params.sort]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput.trim()), 280);
    return () => clearTimeout(id);
  }, [searchInput]);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: productApi.categories,
    staleTime: 5 * 60_000,
  });

  const brandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: () => productApi.brands(40),
    staleTime: 5 * 60_000,
  });

  const parsedMin = minPrice.trim() ? Number(minPrice) : undefined;
  const parsedMax = maxPrice.trim() ? Number(maxPrice) : undefined;

  const productsQuery = useInfiniteQuery({
    queryKey: [
      'explore-products',
      {
        search: debouncedSearch,
        category,
        brand,
        sort,
        condition,
        inStockOnly,
        dealsOnly,
        minPrice: parsedMin,
        maxPrice: parsedMax,
      },
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      productApi.list({
        page: pageParam,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        category: category ?? undefined,
        brand: brand ?? undefined,
        sort,
        condition: condition ?? undefined,
        inStock: inStockOnly || undefined,
        hasDiscount: dealsOnly || undefined,
        minPrice: Number.isFinite(parsedMin) ? parsedMin : undefined,
        maxPrice: Number.isFinite(parsedMax) ? parsedMax : undefined,
      }),
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : null),
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [productsQuery.data],
  );
  const totalCount = productsQuery.data?.pages[0]?.meta.total ?? products.length;

  const activeFilterCount =
    (condition ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (dealsOnly ? 1 : 0) +
    (brand ? 1 : 0) +
    (parsedMin !== undefined ? 1 : 0) +
    (parsedMax !== undefined ? 1 : 0);

  function resetAllFilters() {
    setCategory(null);
    setBrand(null);
    setCondition(null);
    setInStockOnly(false);
    setDealsOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setSearchInput('');
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
      {/* Header & Search Bar */}
      <View className="border-border/70 dark:border-border-dark gap-2.5 border-b px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-accent text-[10px] font-semibold uppercase tracking-widest">
              Marketplace Catalog
            </Text>
            <Text className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Explore Products
            </Text>
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 active:opacity-80"
          >
            <Ionicons name="options-outline" size={16} color={colors.foreground} />
            <Text className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
              Filters
            </Text>
            {activeFilterCount > 0 ? (
              <View className="bg-accent h-4 min-w-[16px] items-center justify-center rounded-full px-1">
                <Text className="text-[10px] font-semibold text-white">{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-2 rounded-2xl border px-3.5">
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search products, brands, stores…"
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

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          <Pressable
            onPress={() => setCategory(null)}
            className={`rounded-full px-3.5 py-1.5 ${
              category === null
                ? 'bg-black dark:bg-white'
                : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark border'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                category === null
                  ? 'text-white dark:text-black'
                  : 'text-neutral-800 dark:text-neutral-200'
              }`}
            >
              All Categories
            </Text>
          </Pressable>
          {(categoriesQuery.data ?? [])
            .filter((c) => c.count > 0)
            .map((c) => {
              const active = category === c.category;
              return (
                <Pressable
                  key={c.category}
                  onPress={() => setCategory(active ? null : c.category)}
                  className={`rounded-full px-3.5 py-1.5 ${
                    active
                      ? 'bg-accent'
                      : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark border'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      active ? 'text-white' : 'text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    {c.category} ({c.count})
                  </Text>
                </Pressable>
              );
            })}
          <Pressable
            onPress={() => router.push('/categories')}
            className="border-border bg-surface dark:border-border-dark dark:bg-surface-dark flex-row items-center gap-1 rounded-full border px-3 py-1.5"
          >
            <Ionicons name="apps-outline" size={13} color={colors.foreground} />
            <Text className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              All Categories ➔
            </Text>
          </Pressable>
        </ScrollView>

        {/* Sort row + Total Count */}
        <View className="flex-row items-center justify-between pt-0.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-1.5 pr-3"
          >
            {SORTS.map((s) => {
              const active = sort === s.key;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setSort(s.key)}
                  className={`rounded-lg px-2.5 py-1 ${
                    active
                      ? 'bg-neutral-900 dark:bg-neutral-100'
                      : 'bg-surface dark:bg-surface-dark'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-medium ${
                      active ? 'text-white dark:text-black' : 'text-muted dark:text-muted-dark'
                    }`}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text className="text-muted dark:text-muted-dark text-xs font-medium">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {/* Active filter tags bar */}
      {brand || condition || inStockOnly || dealsOnly ? (
        <View className="border-border/60 dark:border-border-dark flex-row flex-wrap items-center gap-1.5 border-b px-4 py-2">
          {brand ? (
            <Pressable
              onPress={() => setBrand(null)}
              className="flex-row items-center gap-1 rounded-full bg-black px-2.5 py-1 dark:bg-white"
            >
              <Text className="text-[11px] font-medium text-white dark:text-black">
                Brand: {brand}
              </Text>
              <Ionicons name="close" size={12} color={colors.dark ? '#000' : '#fff'} />
            </Pressable>
          ) : null}
          {condition ? (
            <Pressable
              onPress={() => setCondition(null)}
              className="flex-row items-center gap-1 rounded-full bg-black px-2.5 py-1 dark:bg-white"
            >
              <Text className="text-[11px] font-medium capitalize text-white dark:text-black">
                {condition}
              </Text>
              <Ionicons name="close" size={12} color={colors.dark ? '#000' : '#fff'} />
            </Pressable>
          ) : null}
          {inStockOnly ? (
            <Pressable
              onPress={() => setInStockOnly(false)}
              className="flex-row items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1"
            >
              <Text className="text-[11px] font-medium text-white">In stock</Text>
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          ) : null}
          {dealsOnly ? (
            <Pressable
              onPress={() => setDealsOnly(false)}
              className="bg-accent flex-row items-center gap-1 rounded-full px-2.5 py-1"
            >
              <Text className="text-[11px] font-medium text-white">On sale</Text>
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Product Grid — Pinterest-style masonry */}
      {productsQuery.isPending ? (
        <ScrollView
          className="flex-1 bg-white dark:bg-neutral-950"
          contentContainerClassName="p-4"
          scrollEnabled={false}
        >
          <MasonrySkeleton count={8} />
        </ScrollView>
      ) : productsQuery.isError ? (
        <ErrorState message={productsQuery.error.message} onRetry={() => productsQuery.refetch()} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matching products"
          message="Try clearing some filters or searching with different keywords."
          action={{ title: 'Reset all filters', onPress: resetAllFilters }}
        />
      ) : (
        <ScrollView
          className="flex-1 bg-white dark:bg-neutral-950"
          contentContainerClassName="p-4 pb-10"
          scrollEventThrottle={200}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const nearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 600;
            if (nearEnd && productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
              void productsQuery.fetchNextPage();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isRefetching && !productsQuery.isFetchingNextPage}
              onRefresh={() => {
                void productsQuery.refetch();
              }}
              tintColor={colors.accent}
            />
          }
        >
          <MasonryGrid products={products} />
          {productsQuery.isFetchingNextPage ? (
            <View className="pt-5">
              <MasonrySkeleton count={2} />
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Filter Drawer / Modal */}
      <Modal
        visible={filterOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
          <View className="border-border dark:border-border-dark flex-row items-center justify-between border-b px-4 py-3.5">
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Filter Products
            </Text>
            <Pressable onPress={() => setFilterOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="gap-6 p-4">
            {/* Quick toggles */}
            <View className="gap-2.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Availability & Deals
              </Text>
              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => setInStockOnly((v) => !v)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3 ${
                    inStockOnly
                      ? 'border-emerald-600 bg-emerald-600'
                      : 'border-border dark:border-border-dark bg-surface dark:bg-surface-dark'
                  }`}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={inStockOnly ? '#fff' : colors.foreground}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      inStockOnly ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    In Stock Only
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setDealsOnly((v) => !v)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3 ${
                    dealsOnly
                      ? 'border-accent bg-accent'
                      : 'border-border dark:border-border-dark bg-surface dark:bg-surface-dark'
                  }`}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={dealsOnly ? '#fff' : colors.foreground}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      dealsOnly ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    Discounts Only
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Condition */}
            <View className="gap-2.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Condition
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CONDITIONS.map((c) => {
                  const active = condition === c.key;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => setCondition(active ? null : c.key)}
                      className={`rounded-xl border px-3.5 py-2.5 ${
                        active
                          ? 'border-black bg-black dark:border-white dark:bg-white'
                          : 'border-border dark:border-border-dark bg-surface dark:bg-surface-dark'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          active
                            ? 'text-white dark:text-black'
                            : 'text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Price Range */}
            <View className="gap-2.5">
              <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Price Range (GH₵)
              </Text>
              <View className="flex-row items-center gap-3">
                <TextInput
                  value={minPrice}
                  onChangeText={setMinPrice}
                  placeholder="Min (e.g. 50)"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark h-11 flex-1 rounded-xl border px-3.5 text-sm text-neutral-900 dark:text-neutral-100"
                />
                <Text className="text-muted">to</Text>
                <TextInput
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  placeholder="Max (e.g. 2000)"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark h-11 flex-1 rounded-xl border px-3.5 text-sm text-neutral-900 dark:text-neutral-100"
                />
              </View>
            </View>

            {/* Brands */}
            {(brandsQuery.data ?? []).length > 0 ? (
              <View className="gap-2.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Brand
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {(brandsQuery.data ?? []).map((b) => {
                    const active = brand === b.brand;
                    return (
                      <Pressable
                        key={b.brand}
                        onPress={() => setBrand(active ? null : b.brand)}
                        className={`rounded-full border px-3 py-1.5 ${
                          active
                            ? 'border-accent bg-accent'
                            : 'border-border dark:border-border-dark bg-surface dark:bg-surface-dark'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            active ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
                          }`}
                        >
                          {b.brand} ({b.count})
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View className="border-border dark:border-border-dark flex-row gap-3 border-t p-4">
            <Button title="Reset" variant="outline" onPress={resetAllFilters} className="flex-1" />
            <Button
              title={`Show Results (${totalCount})`}
              onPress={() => setFilterOpen(false)}
              className="flex-1"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
