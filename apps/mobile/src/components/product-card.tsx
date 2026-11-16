import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useThemeColors } from '@/components/ui';
import { useFavorites } from '@/hooks/use-favorites';
import type { Product } from '@/lib/api';
import { discountPercent, formatPrice } from '@/lib/format';
import { ratioFor, rememberRatio } from '@/lib/image-ratio';
import { useCart } from '@/providers/cart-provider';

/**
 * Mirrors `apps/web/components/products/ProductCard.tsx` in a Pinterest-style
 * layout: the image keeps its natural shape (no fixed square), with
 * badges on top, quick actions bottom-left, and a light text footer.
 */
export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const { addItem } = useCart();
  const colors = useThemeColors();
  const [justAdded, setJustAdded] = useState(false);

  const imageUrl = product.image_urls?.[0];
  const [heightRatio, setHeightRatio] = useState(() => ratioFor(imageUrl, product.id));
  const [loaded, setLoaded] = useState(false);

  const fav = isFavorite(product.id);
  const discount = discountPercent(product.price, product.original_price);
  const soldOut = product.quantity_available <= 0;
  const storeLink = product.seller?.store_link;
  const storeName = product.seller?.store_name || storeLink || 'Verndly Seller';

  function handleQuickAdd(e: any) {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (soldOut) return;
    addItem(
      {
        productId: product.id,
        variantId: null,
        variantLabel: null,
        title: product.title,
        price: String(product.price),
        imageUrl: imageUrl || '',
        storeLink: storeLink || 'vendor',
        storeName,
        logoUrl: product.seller?.logo_url ?? null,
      },
      1,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  function handleToggleFav(e: any) {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    toggle(product.id);
  }

  function handleOpenStore(e: any) {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (storeLink) {
      router.push({ pathname: '/store/[slug]', params: { slug: storeLink } });
    }
  }

  return (
    <Link href={{ pathname: '/product/[id]', params: { id: product.id } }} asChild>
      <Pressable className="active:opacity-90">
        {/* Media — natural aspect ratio */}
        <View
          className="relative overflow-hidden rounded-[20px]"
          style={{
            aspectRatio: 1 / heightRatio,
            backgroundColor: loaded ? 'transparent' : colors.dark ? '#1f1f1f' : '#eceef1',
          }}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
              recyclingKey={product.id}
              onLoad={(e) => {
                const { width, height } = e.source;
                rememberRatio(imageUrl, width, height);
                const next = ratioFor(imageUrl, product.id);
                if (Math.abs(next - heightRatio) > 0.02) setHeightRatio(next);
                setLoaded(true);
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="image-outline" size={28} color={colors.muted} />
            </View>
          )}

          {/* Top-left badges */}
          <View className="absolute left-2 top-2 flex-col items-start gap-1">
            {product.is_featured ? (
              <View className="flex-row items-center gap-1 rounded-full bg-red-600 px-2 py-0.5">
                <Ionicons name="sparkles" size={9} color="#fff" />
                <Text className="text-[10px] font-medium text-white">Hot Sale</Text>
              </View>
            ) : null}
            {discount > 0 ? (
              <View className="rounded-full bg-emerald-600 px-2 py-0.5">
                <Text className="text-[10px] font-medium text-white">-{discount}%</Text>
              </View>
            ) : null}
          </View>

          {soldOut ? (
            <View className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-white">Sold out</Text>
            </View>
          ) : null}

          {/* Quick actions */}
          <View className="absolute bottom-2 left-2 flex-row items-center gap-1.5">
            {!soldOut ? (
              <Pressable
                hitSlop={6}
                accessibilityLabel="Quick add to cart"
                onPress={handleQuickAdd}
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  justAdded ? 'bg-emerald-600' : 'bg-white/95 dark:bg-neutral-900/95'
                }`}
              >
                <Ionicons
                  name={justAdded ? 'checkmark' : 'cart-outline'}
                  size={15}
                  color={justAdded ? '#ffffff' : colors.foreground}
                />
              </Pressable>
            ) : null}
            <Pressable
              hitSlop={6}
              accessibilityLabel={fav ? 'Remove from favorites' : 'Save to favorites'}
              onPress={handleToggleFav}
              className={`h-8 w-8 items-center justify-center rounded-full ${
                fav ? 'bg-rose-500' : 'bg-white/95 dark:bg-neutral-900/95'
              }`}
            >
              <Ionicons
                name={fav ? 'heart' : 'heart-outline'}
                size={15}
                color={fav ? '#ffffff' : colors.foreground}
              />
            </Pressable>
          </View>
        </View>

        {/* Footer — regular weights, like native shopping apps */}
        <View className="gap-0.5 px-1 pt-2">
          <Text
            numberOfLines={2}
            className="text-[13px] leading-[18px] text-neutral-800 dark:text-neutral-200"
          >
            {product.title}
          </Text>

          <View className="flex-row items-baseline gap-1.5">
            <Text className="text-accent text-[13px] font-semibold">
              {formatPrice(product.price, product.currency)}
            </Text>
            {discount > 0 ? (
              <Text className="text-muted dark:text-muted-dark text-[11px] line-through">
                {formatPrice(product.original_price, product.currency)}
              </Text>
            ) : null}
          </View>

          {product.seller ? (
            <Pressable
              onPress={handleOpenStore}
              className="mt-1 flex-row items-center gap-1.5 active:opacity-75"
            >
              {product.seller.logo_url ? (
                <Image
                  source={{ uri: product.seller.logo_url }}
                  style={{ width: 16, height: 16, borderRadius: 999 }}
                  contentFit="cover"
                />
              ) : (
                <View className="bg-surface dark:bg-surface-dark h-4 w-4 items-center justify-center rounded-full">
                  <Text className="text-[9px] text-neutral-600 dark:text-neutral-300">
                    {storeName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                numberOfLines={1}
                className="text-muted dark:text-muted-dark flex-1 text-[11px]"
              >
                {storeLink ? `@${storeLink}` : storeName}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
