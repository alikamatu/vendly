import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/components/ui';
import type { BrowseStore, ShowcaseProduct, TopProVendor } from '@/lib/api';
import { formatPrice } from '@/lib/format';

export type StoreCardItem =
  | BrowseStore
  | (TopProVendor & { is_verified?: boolean; products?: ShowcaseProduct[] });

/**
 * Mirrors `apps/web/components/stores-browser/StoreCard.tsx`:
 * - Store banner header + overlapping rounded-2xl logo
 * - Store name + PRO badge + blue verified checkmark
 * - Location with pin icon + store bio
 * - 3-item Product Showcase grid with price overlays
 * - "Visit Store" button
 */
export function StoreCard({ store, compact = false }: { store: StoreCardItem; compact?: boolean }) {
  const router = useRouter();
  const colors = useThemeColors();
  const previewProducts: ShowcaseProduct[] = (
    'products' in store && Array.isArray(store.products) ? store.products : []
  ).slice(0, 3);

  function openStore() {
    router.push({ pathname: '/store/[slug]', params: { slug: store.store_link } });
  }

  return (
    <Pressable
      onPress={openStore}
      style={compact ? { width: 290 } : undefined}
      className="border-border dark:border-border-dark overflow-hidden rounded-3xl border bg-white shadow-sm active:opacity-95 dark:bg-neutral-900"
    >
      {/* Header strip */}
      <View className="relative h-20 bg-neutral-900">
        <View className="absolute inset-0 bg-black/25" />

        {store.is_pro ? (
          <View className="bg-accent absolute right-3 top-3 flex-row items-center gap-1 rounded-full px-2.5 py-1">
            <Ionicons name="sparkles" size={10} color="#fff" />
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-white">
              PRO
            </Text>
          </View>
        ) : null}
      </View>

      {/* Overlapping Logo & Identity */}
      <View className="px-4 pb-4">
        <View className="-mt-8 mb-2.5 flex-row items-end justify-between">
          <View className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-white bg-neutral-900 shadow dark:border-neutral-900">
            {store.logo_url ? (
              <Image
                source={{ uri: store.logo_url }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-neutral-900">
                <Text className="text-xl font-semibold text-white">
                  {store.store_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {store.location ? (
            <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark flex-row items-center gap-1 rounded-full border px-2.5 py-1">
              <Ionicons name="location-outline" size={12} color={colors.muted} />
              <Text
                numberOfLines={1}
                className="text-muted dark:text-muted-dark max-w-[140px] text-[11px]"
              >
                {store.location}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Store Name + Verified */}
        <View className="flex-row items-center gap-1.5">
          <Text
            numberOfLines={1}
            className="flex-shrink text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {store.store_name}
          </Text>
          {'is_verified' in store && store.is_verified ? (
            <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
          ) : null}
        </View>
        <Text className="text-muted dark:text-muted-dark text-xs">@{store.store_link}</Text>

        {store.bio ? (
          <Text
            numberOfLines={2}
            className="text-muted dark:text-muted-dark mt-1.5 text-xs leading-4"
          >
            {store.bio}
          </Text>
        ) : null}

        {/* Product Showcase 3-column mini grid */}
        <View className="mt-3">
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="text-muted dark:text-muted-dark text-[10px] font-medium uppercase tracking-wider">
              Product Showcase
            </Text>
            <Text className="text-muted dark:text-muted-dark text-[10px]">
              {store.products_count > 0 ? `${store.products_count} items` : 'Verified store'}
            </Text>
          </View>
          <View className="flex-row gap-2">
            {[0, 1, 2].map((idx) => {
              const item = previewProducts[idx];
              if (!item) {
                return (
                  <View
                    key={idx}
                    className="bg-surface dark:bg-surface-dark border-border/60 dark:border-border-dark aspect-square flex-1 items-center justify-center rounded-xl border"
                  >
                    <Ionicons name="cube-outline" size={16} color={colors.muted} />
                  </View>
                );
              }
              return (
                <Pressable
                  key={item.id}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({ pathname: '/product/[id]', params: { id: item.id } });
                  }}
                  className="bg-surface dark:bg-surface-dark relative aspect-square flex-1 overflow-hidden rounded-xl"
                >
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : null}
                  <View className="absolute bottom-1 left-1 right-1 rounded-md bg-black/70 px-1 py-0.5">
                    <Text
                      numberOfLines={1}
                      className="text-center text-[9px] font-medium text-white"
                    >
                      {formatPrice(item.price)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Visit Store CTA */}
        <View className="mt-3.5 flex-row items-center justify-center gap-1.5 rounded-xl bg-black py-2.5 dark:bg-white">
          <Text className="text-xs font-medium text-white dark:text-black">Visit Store</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.dark ? '#000' : '#fff'} />
        </View>
      </View>
    </Pressable>
  );
}
