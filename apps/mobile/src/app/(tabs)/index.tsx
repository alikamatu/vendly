import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MasonryGrid } from '@/components/masonry-grid';
import { ProductCard } from '@/components/product-card';
import { HomeSkeleton } from '@/components/skeleton';
import { StoreCard } from '@/components/store-card';
import { ErrorState, SectionHeader, useThemeColors } from '@/components/ui';
import { useFavorites } from '@/hooks/use-favorites';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { notificationApi, productApi, storeApi, type Product } from '@/lib/api';
import { discountPercent, groupByBrand, resolveCategoryImage } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { useThemeMode } from '@/providers/theme-provider';

const verndlyLogo = require('../../../assets/verndly-logo.png');
const heroBg = require('../../../assets/hero-bg.jpeg');

/** Pinterest-style masonry, matching the web's `columns-2` product grid. */
function TwoColGrid({ products }: { products: Product[] }) {
  return <MasonryGrid products={products} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { isDark, toggle: toggleTheme } = useThemeMode();
  const { isAuthenticated } = useAuth();
  const { ids: favIds } = useFavorites();
  const { items: recentlyViewed } = useRecentlyViewed();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['home-products', selectedCategory],
    queryFn: () =>
      productApi.list({
        page: 1,
        limit: 40,
        category: selectedCategory ?? undefined,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: productApi.categories,
    staleTime: 5 * 60_000,
  });

  const storesQuery = useQuery({
    queryKey: ['home-stores'],
    queryFn: async () => {
      const [pro, all] = await Promise.all([
        storeApi.topPro().catch(() => []),
        storeApi.browse({ page: 1, limit: 8 }).catch(() => ({
          stores: [],
          total: 0,
          page: 1,
          limit: 8,
          totalPages: 0,
        })),
      ]);
      if (pro && pro.length > 0) return pro;
      return all.stores ?? [];
    },
    staleTime: 2 * 60_000,
  });

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationApi.unreadCount,
    enabled: isAuthenticated,
  });

  const allProducts = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);
  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.count > 0),
    [categoriesQuery.data],
  );
  const topCategories = useMemo(() => categories.slice(0, 4), [categories]);
  const featuredStores = useMemo(() => storesQuery.data ?? [], [storesQuery.data]);

  const featuredProducts = useMemo(() => allProducts.slice(0, 8), [allProducts]);
  const brandSections = useMemo(() => groupByBrand(allProducts, 2, 4), [allProducts]);
  const topDeals = useMemo(
    () =>
      allProducts
        .filter((p) => discountPercent(p.price, p.original_price) > 0 || p.is_featured)
        .slice(0, 6),
    [allProducts],
  );
  const recentlyAdded = useMemo(
    () =>
      [...allProducts]
        .sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        )
        .slice(0, 6),
    [allProducts],
  );

  const unreadCount = unreadQuery.data?.count ?? 0;

  async function onRefresh() {
    await Promise.all([
      productsQuery.refetch(),
      categoriesQuery.refetch(),
      storesQuery.refetch(),
      isAuthenticated ? unreadQuery.refetch() : Promise.resolve(),
    ]);
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
      <View className="border-border/70 dark:border-border-dark flex-row items-center justify-between border-b bg-white px-4 py-2.5 dark:bg-neutral-950">
        <View className="flex-row items-center gap-2">
          <Image
            source={verndlyLogo}
            style={{ width: 28, height: 28, borderRadius: 6 }}
            contentFit="contain"
          />
          <Text className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Verndly
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5">
          {/* Quick Search Trigger */}
          <Pressable
            onPress={() => router.push('/explore')}
            accessibilityLabel="Search marketplace"
            className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark h-9 flex-row items-center gap-1.5 rounded-full border px-3 active:opacity-80"
          >
            <Ionicons name="search" size={15} color={colors.muted} />
            <Text className="text-muted dark:text-muted-dark text-xs font-normal">Search…</Text>
          </Pressable>

          {/* Saved / Favorites */}
          <Pressable
            onPress={() => router.push('/favorites')}
            accessibilityLabel="Saved items"
            className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark relative h-9 w-9 items-center justify-center rounded-full border active:opacity-80"
          >
            <Ionicons name="heart-outline" size={18} color={colors.foreground} />
            {favIds.size > 0 ? (
              <View className="bg-accent absolute -right-1 -top-1 min-w-[16px] items-center justify-center rounded-full px-1 py-0.5">
                <Text className="text-[9px] font-semibold text-white">{favIds.size}</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Notifications */}
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
            className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark relative h-9 w-9 items-center justify-center rounded-full border active:opacity-80"
          >
            <Ionicons name="notifications-outline" size={18} color={colors.foreground} />
            {unreadCount > 0 ? (
              <View className="bg-accent absolute -right-1 -top-1 min-w-[16px] items-center justify-center rounded-full px-1 py-0.5">
                <Text className="text-[9px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {/* Theme Toggle (Light / Dark) */}
          <Pressable
            onPress={toggleTheme}
            accessibilityLabel="Toggle theme"
            className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark h-9 w-9 items-center justify-center rounded-full border active:opacity-80"
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={17}
              color={colors.foreground}
            />
          </Pressable>
        </View>
      </View>

      {productsQuery.isPending && !productsQuery.data ? (
        <ScrollView className="flex-1 bg-white dark:bg-neutral-950" scrollEnabled={false}>
          <HomeSkeleton />
        </ScrollView>
      ) : productsQuery.isError ? (
        <ErrorState message={productsQuery.error.message} onRetry={() => productsQuery.refetch()} />
      ) : (
        <ScrollView
          className="flex-1 bg-white dark:bg-neutral-950"
          contentContainerClassName="pb-12"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          <View className="px-4 pt-4">
            <View className="relative overflow-hidden rounded-3xl bg-neutral-900">
              <Image
                source={heroBg}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                contentFit="cover"
              />
              <View className="bg-black/65 p-6">
                {/* Verified marketplace pill */}
                <View className="mb-3 flex-row items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  <View className="h-2 w-2 rounded-full bg-emerald-400" />
                  <Text className="text-[10px] font-semibold uppercase tracking-widest text-white">
                    Verified Marketplace for Modern Businesses
                  </Text>
                </View>

                <Text className="text-3xl font-bold leading-tight text-white">
                  Sell smarter,{'\n'}not harder.
                </Text>
                <Text className="mt-2 text-xs leading-5 text-white/85">
                  Discover verified stores, shop authentic products with instant checkout, and
                  connect directly with trusted entrepreneurs.
                </Text>

                <View className="mt-5 flex-row flex-wrap items-center gap-2.5">
                  <Pressable
                    onPress={() => router.push('/explore')}
                    className="flex-row items-center gap-1.5 rounded-full bg-white px-4 py-2.5 active:opacity-90"
                  >
                    <Text className="text-xs font-semibold text-black">Browse market</Text>
                    <Ionicons name="arrow-forward" size={14} color="#000" />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/stores')}
                    className="flex-row items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 active:opacity-90"
                  >
                    <Ionicons name="storefront-outline" size={14} color="#fff" />
                    <Text className="text-xs font-medium text-white">Explore stores</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {topCategories.length > 0 ? (
            <View className="mt-7 px-4">
              <SectionHeader
                eyebrow="Browse Categories"
                eyebrowIcon="grid-outline"
                title="Shop by Category"
                subtitle="Explore curated collections across top marketplace categories"
                actionLabel="View All"
                onAction={() => router.push('/categories')}
              />

              <View className="flex-row flex-wrap gap-3">
                {topCategories.map((cat) => {
                  const active = selectedCategory === cat.category;
                  return (
                    <Pressable
                      key={cat.category}
                      onPress={() => setSelectedCategory(active ? null : cat.category)}
                      style={{ width: '48%' }}
                      className={`relative h-32 overflow-hidden rounded-2xl border ${
                        active ? 'border-accent border-2' : 'border-border dark:border-border-dark'
                      }`}
                    >
                      <Image
                        source={{ uri: resolveCategoryImage(cat.category) }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        contentFit="cover"
                      />
                      <View className="flex-1 justify-between bg-black/50 p-3">
                        <View className="self-start rounded-full bg-white/20 px-2.5 py-0.5">
                          <Text className="text-[10px] font-medium text-white">
                            {cat.count} {cat.count === 1 ? 'item' : 'items'}
                          </Text>
                        </View>
                        <View>
                          <Text numberOfLines={1} className="text-sm font-semibold text-white">
                            {cat.category}
                          </Text>
                          <View className="mt-0.5 flex-row items-center gap-1">
                            <Text className="text-[11px] font-medium text-white/90">
                              {active ? 'Filtering active' : 'Explore'}
                            </Text>
                            <Ionicons name="arrow-forward" size={11} color="#fff" />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Category quick-filter pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2 pt-3"
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
                  const active = selectedCategory === c.category;
                  return (
                    <Pressable
                      key={c.category}
                      onPress={() => setSelectedCategory(active ? null : c.category)}
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
              </ScrollView>
            </View>
          ) : null}

          {featuredStores.length > 0 ? (
            <View className="mt-8">
              <View className="px-4">
                <SectionHeader
                  eyebrow="Verified Vendors"
                  eyebrowIcon="ribbon-outline"
                  title="Featured Stores"
                  subtitle="Shop directly from top-performing verified storefronts"
                  actionLabel="All Stores"
                  onAction={() => router.push('/stores')}
                />
              </View>
              <FlatList
                horizontal
                data={featuredStores}
                keyExtractor={(s) => s.id}
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3.5 px-4"
                renderItem={({ item }) => <StoreCard store={item} compact />}
              />
            </View>
          ) : null}

          {/* 4. Featured Marketplace Grid */}
          <View className="mt-8 px-4">
            <SectionHeader
              eyebrow="Curated Picks"
              eyebrowIcon="flame-outline"
              title={selectedCategory ? selectedCategory : 'Featured Marketplace'}
              subtitle="Authentic items from verified sellers across Ghana"
              actionLabel="Browse All"
              onAction={() =>
                router.push({
                  pathname: '/explore',
                  params: selectedCategory ? { category: selectedCategory } : {},
                })
              }
            />
            {featuredProducts.length > 0 ? (
              <TwoColGrid products={featuredProducts} />
            ) : (
              <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark items-center rounded-2xl border p-8">
                <Text className="text-muted dark:text-muted-dark text-sm">
                  No products found in this category.
                </Text>
              </View>
            )}
          </View>

          {brandSections.length > 0 && !selectedCategory ? (
            <View className="mt-8 px-4">
              <SectionHeader
                eyebrow="Popular Labels"
                eyebrowIcon="pricetag-outline"
                title="Top Verndly Brands"
                subtitle="Shop top brands with the most listings on Verndly"
                actionLabel="Explore"
                onAction={() => router.push('/explore')}
              />

              <View className="gap-6">
                {brandSections.slice(0, 3).map((b) => (
                  <View
                    key={b.brand}
                    className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark rounded-3xl border p-4"
                  >
                    <View className="mb-3 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-black dark:bg-white">
                          <Text className="text-xs font-bold text-white dark:text-black">
                            #{b.rank}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                            {b.brand}
                          </Text>
                          <Text className="text-muted dark:text-muted-dark text-xs">
                            {b.totalCount} products available
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() =>
                          router.push({ pathname: '/explore', params: { brand: b.brand } })
                        }
                        className="border-border dark:border-border-dark flex-row items-center gap-1 rounded-full border bg-white px-3 py-1.5 dark:bg-neutral-900"
                      >
                        <Text className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                          See all
                        </Text>
                        <Ionicons name="arrow-forward" size={12} color={colors.foreground} />
                      </Pressable>
                    </View>
                    <TwoColGrid products={b.products.slice(0, 2)} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 6. Top Deals */}
          {topDeals.length > 0 && !selectedCategory ? (
            <View className="mt-8 px-4">
              <SectionHeader
                eyebrow="Limited Offers"
                eyebrowIcon="sparkles-outline"
                title="Top Deals & Featured"
                subtitle="Grab the best discounts before they sell out"
                actionLabel="All Deals"
                onAction={() =>
                  router.push({ pathname: '/explore', params: { sort: 'discount_desc' } })
                }
              />
              <TwoColGrid products={topDeals.slice(0, 4)} />
            </View>
          ) : null}

          {/* 7. Recently Added */}
          {recentlyAdded.length > 0 && !selectedCategory ? (
            <View className="mt-8 px-4">
              <SectionHeader
                eyebrow="Fresh Arrivals"
                eyebrowIcon="time-outline"
                title="Recently Added"
                subtitle="Latest listings just dropped by sellers"
                actionLabel="See Newest"
                onAction={() => router.push({ pathname: '/explore', params: { sort: 'newest' } })}
              />
              <TwoColGrid products={recentlyAdded.slice(0, 4)} />
            </View>
          ) : null}

          {recentlyViewed.length > 0 ? (
            <View className="mt-8">
              <View className="px-4">
                <SectionHeader
                  eyebrow="Your History"
                  eyebrowIcon="eye-outline"
                  title="Recently Viewed"
                  subtitle="Pick up right where you left off"
                />
              </View>
              <FlatList
                horizontal
                data={recentlyViewed}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3 px-4"
                renderItem={({ item }) => (
                  <View style={{ width: 175 }}>
                    <ProductCard product={item} />
                  </View>
                )}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
