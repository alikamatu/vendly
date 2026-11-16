import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MasonryGrid } from '@/components/masonry-grid';
import { MasonrySkeleton, StorefrontSkeleton } from '@/components/skeleton';
import { EmptyState, ErrorState, useThemeColors } from '@/components/ui';
import { productApi, reviewApi, storeApi, type Product } from '@/lib/api';
import { formatDate, formatWhatsappUrl, humanizeStatus } from '@/lib/format';

export default function StorefrontScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useThemeColors();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const storeQuery = useQuery({
    queryKey: ['store', slug],
    queryFn: () => storeApi.bySlug(slug!),
    enabled: Boolean(slug),
  });

  const storeProductsQuery = useQuery({
    queryKey: ['store-products', slug],
    queryFn: () => productApi.byStoreSlug(slug!),
    enabled: Boolean(slug),
  });

  const store = storeQuery.data;

  const reviewSummaryQuery = useQuery({
    queryKey: ['store-reviews-summary', slug],
    queryFn: () => reviewApi.summaryForStore(slug!),
    enabled: Boolean(slug),
  });

  const allProducts = useMemo(() => storeProductsQuery.data ?? [], [storeProductsQuery.data]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allProducts) {
      const cat = p.category?.trim();
      if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p: Product) => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (q) {
        const hay = `${p.title} ${p.brand ?? ''} ${p.category ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allProducts, search, selectedCategory]);

  const enrichedProducts = useMemo(() => {
    if (!store) return filteredProducts;
    return filteredProducts.map((p) => ({
      ...p,
      seller: p.seller ?? {
        store_name: store.store_name,
        store_link: store.store_link,
        logo_url: store.logo_url,
        is_verified: store.is_verified,
        is_pro: store.is_pro,
      },
    }));
  }, [filteredProducts, store]);

  if (storeQuery.isPending) return <StorefrontSkeleton />;
  if (storeQuery.isError || !store) {
    return (
      <ErrorState
        message={storeQuery.error?.message ?? 'Storefront not found'}
        onRetry={() => storeQuery.refetch()}
      />
    );
  }

  const whatsappUrl = formatWhatsappUrl(
    store.whatsapp_number,
    `Hi ${store.store_name}, I saw your storefront on Verndly (@${store.store_link})!`,
  );
  const reviewSummary = reviewSummaryQuery.data;

  async function handleShareStore() {
    if (!store) return;
    await Share.share({
      message: `Check out ${store.store_name} (@${store.store_link}) on Verndly: https://verndly.com/s/${store.store_link}`,
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: store.store_name }} />
      <ScrollView
        className="flex-1 bg-white dark:bg-neutral-950"
        contentContainerClassName="pb-12"
        refreshControl={
          <RefreshControl
            refreshing={storeQuery.isRefetching || storeProductsQuery.isRefetching}
            onRefresh={() => {
              void storeQuery.refetch();
              void storeProductsQuery.refetch();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {/* Banner */}
        <View className="relative h-36 bg-neutral-900">
          <View className="absolute inset-0 bg-black/30" />
        </View>

        {/* Store Profile Header Card */}
        <View className="px-4">
          <View className="-mt-12 mb-3 flex-row items-end justify-between">
            <View className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-white bg-neutral-900 shadow dark:border-neutral-950">
              {store.logo_url ? (
                <Image
                  source={{ uri: store.logo_url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center bg-neutral-900">
                  <Text className="text-3xl font-semibold text-white">
                    {store.store_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-2">
              {whatsappUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(whatsappUrl)}
                  className="flex-row items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 active:opacity-85"
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text className="text-xs font-medium text-white">WhatsApp Seller</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleShareStore}
                accessibilityLabel="Share store"
                className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark h-10 w-10 items-center justify-center rounded-full border active:opacity-80"
              >
                <Ionicons name="share-social-outline" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Identity */}
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {store.store_name}
            </Text>
            {store.is_verified ? (
              <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
            ) : null}
            {store.is_pro ? (
              <View className="bg-accent flex-row items-center gap-1 rounded-full px-2.5 py-0.5">
                <Ionicons name="sparkles" size={10} color="#fff" />
                <Text className="text-[10px] font-semibold uppercase text-white">PRO</Text>
              </View>
            ) : null}
          </View>
          <Text className="text-muted dark:text-muted-dark text-sm">@{store.store_link}</Text>

          {store.bio ? (
            <Text className="mt-2.5 text-sm leading-5 text-neutral-700 dark:text-neutral-300">
              {store.bio}
            </Text>
          ) : null}

          {/* Store Metadata Chips */}
          <View className="mt-3.5 flex-row flex-wrap gap-2">
            {store.location ? (
              <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-1.5 rounded-full border px-3 py-1">
                <Ionicons name="location-outline" size={13} color={colors.muted} />
                <Text className="text-xs text-neutral-800 dark:text-neutral-200">
                  {store.location}
                </Text>
              </View>
            ) : null}
            {store.avg_delivery_time ? (
              <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-1.5 rounded-full border px-3 py-1">
                <Ionicons name="flash-outline" size={13} color={colors.accent} />
                <Text className="text-xs text-neutral-800 dark:text-neutral-200">
                  {humanizeStatus(store.avg_delivery_time)}
                </Text>
              </View>
            ) : null}
            {reviewSummary && reviewSummary.count > 0 ? (
              <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-1 rounded-full border px-3 py-1">
                <Ionicons name="star" size={13} color="#f59e0b" />
                <Text className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  {reviewSummary.average.toFixed(1)}
                </Text>
                <Text className="text-muted dark:text-muted-dark text-xs">
                  ({reviewSummary.count})
                </Text>
              </View>
            ) : null}
            {store.member_since ? (
              <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-1.5 rounded-full border px-3 py-1">
                <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                <Text className="text-muted dark:text-muted-dark text-xs">
                  Joined {formatDate(store.member_since)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Delivery Policies / Business Hours if present */}
          {store.business_hours || store.delivery_policies ? (
            <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark mt-4 gap-2 rounded-2xl border p-3.5">
              {store.business_hours ? (
                <View className="flex-row items-start gap-2">
                  <Ionicons name="time-outline" size={16} color={colors.muted} />
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      Business Hours
                    </Text>
                    <Text className="text-muted dark:text-muted-dark text-xs">
                      {store.business_hours}
                    </Text>
                  </View>
                </View>
              ) : null}
              {store.delivery_policies ? (
                <View className="flex-row items-start gap-2">
                  <Ionicons name="car-outline" size={16} color={colors.muted} />
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      Delivery Info
                    </Text>
                    <Text className="text-muted dark:text-muted-dark text-xs">
                      {store.delivery_policies}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* In-store Catalog Search & Categories */}
          <View className="mt-6 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Store Catalog ({filteredProducts.length})
              </Text>
            </View>

            <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-2 rounded-2xl border px-3.5">
              <Ionicons name="search" size={17} color={colors.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={`Search in ${store.store_name}…`}
                placeholderTextColor={colors.muted}
                className="h-10 flex-1 text-sm text-neutral-900 dark:text-neutral-100"
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>

            {categories.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                <Pressable
                  onPress={() => setSelectedCategory(null)}
                  className={`rounded-full px-3.5 py-1.5 ${
                    selectedCategory === null
                      ? 'bg-black dark:bg-white'
                      : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark border'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      selectedCategory === null
                        ? 'text-white dark:text-black'
                        : 'text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    All ({allProducts.length})
                  </Text>
                </Pressable>
                {categories.map((c) => {
                  const active = selectedCategory === c.name;
                  return (
                    <Pressable
                      key={c.name}
                      onPress={() => setSelectedCategory(active ? null : c.name)}
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
                        {c.name} ({c.count})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Store Products — Pinterest-style Masonry Grid */}
            {storeProductsQuery.isPending ? (
              <View className="mt-2">
                <MasonrySkeleton count={4} />
              </View>
            ) : enrichedProducts.length > 0 ? (
              <View className="mt-2">
                <MasonryGrid products={enrichedProducts} />
              </View>
            ) : (
              <EmptyState
                icon="cube-outline"
                title="No matching items"
                message="This store has no products matching your current filter."
              />
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
