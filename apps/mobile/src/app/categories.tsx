import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoriesSkeleton } from '@/components/skeleton';
import { EmptyState, ErrorState, SectionHeader, useThemeColors } from '@/components/ui';
import { productApi, type Brand, type Category } from '@/lib/api';
import { resolveCategoryImage } from '@/lib/format';

type ViewTab = 'all' | 'categories' | 'brands';

export default function CategoriesScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ViewTab>('all');

  const categoriesQuery = useQuery({
    queryKey: ['categories-gallery'],
    queryFn: productApi.categories,
    staleTime: 5 * 60_000,
  });

  const brandsQuery = useQuery({
    queryKey: ['brands-gallery'],
    queryFn: () => productApi.brands(50),
    staleTime: 5 * 60_000,
  });

  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.count > 0 || c.name),
    [categoriesQuery.data],
  );

  const brands = useMemo(() => brandsQuery.data ?? [], [brandsQuery.data]);

  const query = searchQuery.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!query) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)),
    );
  }, [categories, query]);

  const filteredBrands = useMemo(() => {
    if (!query) return brands;
    return brands.filter(
      (b) => b.name.toLowerCase().includes(query) || b.brand.toLowerCase().includes(query),
    );
  }, [brands, query]);

  const isLoading = categoriesQuery.isPending || brandsQuery.isPending;
  const isError = categoriesQuery.isError || brandsQuery.isError;
  const errorMessage =
    categoriesQuery.error?.message || brandsQuery.error?.message || 'Failed to load categories';

  const onRefresh = async () => {
    await Promise.all([categoriesQuery.refetch(), brandsQuery.refetch()]);
  };

  const handleCategoryPress = (cat: Category) => {
    router.push({
      pathname: '/explore',
      params: { category: cat.category || cat.name },
    });
  };

  const handleBrandPress = (brand: Brand) => {
    router.push({
      pathname: '/explore',
      params: { brand: brand.brand || brand.name },
    });
  };

  const hasResults =
    (activeTab === 'all' && (filteredCategories.length > 0 || filteredBrands.length > 0)) ||
    (activeTab === 'categories' && filteredCategories.length > 0) ||
    (activeTab === 'brands' && filteredBrands.length > 0);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white dark:bg-neutral-950">
      {/* Header bar */}
      <View className="border-border/80 dark:border-border-dark gap-3 border-b px-4 pb-3.5 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark h-9 w-9 items-center justify-center rounded-full border"
            >
              <Ionicons name="arrow-back" size={18} color={colors.foreground} />
            </Pressable>
            <View>
              <Text className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Categories & Brands
              </Text>
              <Text className="text-muted dark:text-muted-dark text-[11px]">
                {categories.length} departments • {brands.length} verified brands
              </Text>
            </View>
          </View>
        </View>

        {/* Search input */}
        <View className="border-border bg-surface dark:border-border-dark dark:bg-surface-dark h-11 flex-row items-center gap-2.5 rounded-2xl border px-3.5">
          <Ionicons name="search" size={17} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search categories, collections, or brands..."
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            className="h-full flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Pills */}
        <View className="flex-row items-center gap-2 pt-0.5">
          <Pressable
            onPress={() => setActiveTab('all')}
            className={`rounded-full px-3.5 py-1.5 ${
              activeTab === 'all'
                ? 'bg-black dark:bg-white'
                : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark border'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'all'
                  ? 'text-white dark:text-black'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              All ({categories.length + brands.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('categories')}
            className={`rounded-full px-3.5 py-1.5 ${
              activeTab === 'categories'
                ? 'bg-black dark:bg-white'
                : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark border'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'categories'
                  ? 'text-white dark:text-black'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Categories ({filteredCategories.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('brands')}
            className={`rounded-full px-3.5 py-1.5 ${
              activeTab === 'brands'
                ? 'bg-black dark:bg-white'
                : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark border'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === 'brands'
                  ? 'text-white dark:text-black'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              Brands ({filteredBrands.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <ScrollView className="flex-1" scrollEnabled={false}>
          <CategoriesSkeleton />
        </ScrollView>
      ) : isError ? (
        <ErrorState message={errorMessage} onRetry={onRefresh} />
      ) : !hasResults ? (
        <EmptyState
          icon="search-outline"
          title="No results found"
          message={`We couldn't find any categories or brands matching "${searchQuery}".`}
          action={{ title: 'Clear Search', onPress: () => setSearchQuery('') }}
        />
      ) : (
        <ScrollView
          className="flex-1 bg-white dark:bg-neutral-950"
          contentContainerClassName="p-4 gap-7 pb-16"
          refreshControl={
            <RefreshControl
              refreshing={categoriesQuery.isRefetching || brandsQuery.isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {/* Categories Showcase */}
          {activeTab !== 'brands' && filteredCategories.length > 0 ? (
            <View className="gap-3.5">
              <SectionHeader
                eyebrow="Marketplace Departments"
                eyebrowIcon="grid-outline"
                title="Browse by Category"
                subtitle="Explore curated listings by product category"
              />

              <View className="flex-row flex-wrap gap-3">
                {filteredCategories.map((cat) => {
                  const bgUrl = resolveCategoryImage(cat.name, cat.image_url);
                  return (
                    <Pressable
                      key={cat.id || cat.name}
                      onPress={() => handleCategoryPress(cat)}
                      style={{ width: '48%' }}
                      className="border-border/80 dark:border-border-dark relative h-40 overflow-hidden rounded-2xl border bg-neutral-900 active:opacity-90"
                    >
                      <Image
                        source={{ uri: bgUrl }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        contentFit="cover"
                      />
                      <View className="flex-1 justify-between bg-black/55 p-3.5">
                        <View className="backdrop-blur-xs self-start rounded-full bg-white/20 px-2.5 py-0.5">
                          <Text className="text-[10px] font-semibold text-white">
                            {cat.count} {cat.count === 1 ? 'item' : 'items'}
                          </Text>
                        </View>

                        <View className="gap-1">
                          <Text
                            numberOfLines={1}
                            className="text-base font-bold tracking-tight text-white"
                          >
                            {cat.category || cat.name}
                          </Text>
                          <View className="flex-row items-center gap-1">
                            <Text className="text-[11px] font-medium text-white/90">
                              Explore collection
                            </Text>
                            <Ionicons name="arrow-forward" size={11} color="#ffffff" />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Top Brands Showcase */}
          {activeTab !== 'categories' && filteredBrands.length > 0 ? (
            <View className="gap-3.5">
              <SectionHeader
                eyebrow="Verified Labels"
                eyebrowIcon="pricetag-outline"
                title="Top Brands"
                subtitle="Shop directly by certified marketplace brands and campus sellers"
              />

              <View className="flex-row flex-wrap gap-2.5">
                {filteredBrands.map((b, idx) => (
                  <Pressable
                    key={b.id || b.name}
                    onPress={() => handleBrandPress(b)}
                    className="border-border bg-surface dark:border-border-dark dark:bg-surface-dark flex-row items-center gap-2 rounded-2xl border px-3.5 py-2.5 active:opacity-85"
                  >
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
                      <Text className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {b.brand || b.name}
                    </Text>
                    <View className="rounded-full bg-neutral-200 px-2 py-0.5 dark:bg-neutral-800">
                      <Text className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                        {b.count}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
