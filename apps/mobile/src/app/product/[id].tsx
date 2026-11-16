import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { ProductDetailSkeleton } from '@/components/skeleton';
import { Badge, Button, EmptyState, ErrorState, useThemeColors } from '@/components/ui';
import { useFavorites } from '@/hooks/use-favorites';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { productApi, reviewApi, type ProductVariant, type Review } from '@/lib/api';
import { discountPercent, formatDate, formatPrice } from '@/lib/format';
import { useCart } from '@/providers/cart-provider';

const { width } = Dimensions.get('window');

function matchVariant(
  variants: ProductVariant[],
  selected: Record<string, string>,
): ProductVariant | null {
  if (!variants.length) return null;
  const entries = Object.entries(selected);
  return (
    variants.find((v) => {
      if (!v.attributes) return false;
      return entries.every(([key, val]) => v.attributes[key] === val);
    }) || null
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const { addItem } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const { items: recentlyViewed, recordView } = useRecentlyViewed();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  const {
    data: product,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.byId(id!),
    enabled: !!id,
  });

  const reviewSummaryQuery = useQuery({
    queryKey: ['product-review-summary', id],
    queryFn: () => reviewApi.summaryForProduct(id!),
    enabled: !!id,
  });

  const reviewsQuery = useQuery({
    queryKey: ['product-reviews', id],
    queryFn: () => reviewApi.listForProduct(id!, { limit: 5 }),
    enabled: !!id,
  });

  useEffect(() => {
    if (product) {
      recordView(product);
    }
  }, [product, recordView]);

  const variants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product?.variants],
  );
  const hasVariants = variants.length > 0;

  const axes = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const v of variants) {
      if (!v.attributes) continue;
      for (const [key, val] of Object.entries(v.attributes)) {
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(val);
      }
    }
    return Array.from(map.entries()).map(([name, set]) => ({
      name,
      values: Array.from(set),
    }));
  }, [variants]);

  useEffect(() => {
    if (hasVariants && axes.length && Object.keys(selectedAttrs).length === 0) {
      const initial: Record<string, string> = {};
      axes.forEach((a) => {
        if (a.values[0]) initial[a.name] = a.values[0];
      });
      setSelectedAttrs(initial);
    }
  }, [hasVariants, axes, selectedAttrs]);

  const currentVariant = useMemo(
    () => (hasVariants ? matchVariant(variants, selectedAttrs) : null),
    [hasVariants, variants, selectedAttrs],
  );

  if (isPending) {
    return (
      <ScrollView className="flex-1 bg-white dark:bg-neutral-950" scrollEnabled={false}>
        <ProductDetailSkeleton width={width} />
      </ScrollView>
    );
  }
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!product) return <EmptyState icon="alert-circle-outline" title="Product not found" />;

  const fav = isFavorite(product.id);
  const images =
    Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls : [];

  const displayPrice = currentVariant?.price ? currentVariant.price : product.price;
  const discount = discountPercent(displayPrice, product.original_price);
  const availableStock = currentVariant
    ? currentVariant.quantity_available
    : product.quantity_available;
  const isOutOfStock = availableStock <= 0;

  function addCurrentItemToCart(): string | null {
    if (!product) return null;
    if (hasVariants && !currentVariant) {
      Alert.alert('Select Options', 'Please choose your preferred variant before adding to cart.');
      return null;
    }
    if (isOutOfStock) {
      Alert.alert('Out of Stock', 'This item or selected variant is currently sold out.');
      return null;
    }

    const variantLabel = currentVariant
      ? Object.entries(currentVariant.attributes)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : null;

    const storeLink = product.seller?.store_link || 'vendor';

    addItem(
      {
        productId: product.id,
        variantId: currentVariant?.id ?? null,
        variantLabel,
        title: product.title,
        price: String(displayPrice),
        imageUrl: currentVariant?.image_url || images[0] || '',
        storeLink,
        storeName: product.seller?.store_name || 'Store',
        logoUrl: product.seller?.logo_url ?? null,
      },
      quantity,
    );

    return storeLink;
  }

  function handleAddToCart() {
    const storeLink = addCurrentItemToCart();
    if (!storeLink) return;
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2200);
  }

  function handleBuyNow() {
    const storeLink = addCurrentItemToCart();
    if (!storeLink) return;
    router.push({ pathname: '/checkout/[storeLink]', params: { storeLink } });
  }

  async function handleShare() {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.title} on Verndly! https://verndly.com/product/${product.id}`,
      });
    } catch {
      // ignore
    }
  }

  const reviewSummary = reviewSummaryQuery.data;
  const reviews: Review[] = reviewsQuery.data?.items ?? [];
  const otherRecent = recentlyViewed.filter((p) => p.id !== product.id);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-28">
        {/* Image Gallery */}
        <View className="bg-surface dark:bg-surface-dark relative">
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(idx);
              }}
            >
              {images.map((url, i) => (
                <View key={i} style={{ width, height: width }}>
                  <Image
                    source={{ uri: url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ width, height: width }} className="items-center justify-center">
              <Ionicons name="image-outline" size={64} color={colors.muted} />
            </View>
          )}

          {/* Top-left badges */}
          <View className="absolute left-4 top-4 flex-col items-start gap-1.5">
            {product.is_featured ? (
              <View className="flex-row items-center gap-1 rounded-full bg-red-600 px-3 py-1">
                <Ionicons name="sparkles" size={12} color="#fff" />
                <Text className="text-xs font-bold text-white">Hot Sale</Text>
              </View>
            ) : null}
            {discount > 0 ? (
              <View className="rounded-full bg-emerald-600 px-3 py-1">
                <Text className="text-xs font-bold text-white">-{discount}% OFF</Text>
              </View>
            ) : null}
          </View>

          {/* Action buttons overlay */}
          <View className="absolute right-4 top-4 flex-row gap-2">
            <Pressable
              onPress={handleShare}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm dark:bg-neutral-900/95"
            >
              <Ionicons name="share-outline" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={() => toggle(product.id)}
              className={`h-10 w-10 items-center justify-center rounded-full shadow-sm ${
                fav ? 'bg-rose-500' : 'bg-white/95 dark:bg-neutral-900/95'
              }`}
            >
              <Ionicons
                name={fav ? 'heart' : 'heart-outline'}
                size={21}
                color={fav ? '#ffffff' : colors.foreground}
              />
            </Pressable>
          </View>

          {/* Pagination dots */}
          {images.length > 1 ? (
            <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">
              {images.map((_, i) => (
                <View
                  key={i}
                  className={`h-2 rounded-full ${
                    activeImageIndex === i
                      ? 'w-6 bg-black dark:bg-white'
                      : 'w-2 bg-black/30 dark:bg-white/30'
                  }`}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Product Info */}
        <View className="gap-5 p-5">
          <View className="gap-2">
            <View className="flex-row flex-wrap items-center gap-2">
              {product.category ? <Badge label={product.category} /> : null}
              {product.brand ? <Badge label={product.brand} tone="neutral" /> : null}
              {product.condition ? <Badge label={product.condition} tone="neutral" /> : null}
            </View>

            <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {product.title}
            </Text>

            <View className="flex-row items-baseline gap-2.5 pt-1">
              <Text className="text-accent text-2xl font-bold">
                {formatPrice(displayPrice, product.currency)}
              </Text>
              {discount > 0 ? (
                <Text className="text-muted dark:text-muted-dark text-sm line-through">
                  {formatPrice(product.original_price, product.currency)}
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center gap-3 pt-0.5">
              {isOutOfStock ? (
                <Badge label="Out of Stock" tone="accent" />
              ) : availableStock <= 5 ? (
                <Badge label={`Only ${availableStock} left in stock`} tone="warning" />
              ) : (
                <Badge label="In Stock & Ready to Ship" tone="success" />
              )}

              {reviewSummary && reviewSummary.count > 0 ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="star" size={15} color="#f59e0b" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {reviewSummary.average.toFixed(1)}
                  </Text>
                  <Text className="text-muted dark:text-muted-dark text-xs">
                    ({reviewSummary.count} {reviewSummary.count === 1 ? 'review' : 'reviews'})
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Variants selection */}
          {hasVariants ? (
            <View className="border-border dark:border-border-dark gap-4 border-t pt-4">
              {axes.map((axis) => (
                <View key={axis.name} className="gap-2">
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {axis.name}:{' '}
                    <Text className="text-muted dark:text-muted-dark font-normal">
                      {selectedAttrs[axis.name]}
                    </Text>
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {axis.values.map((val) => {
                      const isSelected = selectedAttrs[axis.name] === val;
                      return (
                        <Pressable
                          key={val}
                          onPress={() =>
                            setSelectedAttrs((prev) => ({ ...prev, [axis.name]: val }))
                          }
                          className={`rounded-xl border px-4 py-2 ${
                            isSelected
                              ? 'border-black bg-black dark:border-white dark:bg-white'
                              : 'border-border dark:border-border-dark bg-white dark:bg-neutral-900'
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              isSelected
                                ? 'text-white dark:text-black'
                                : 'text-neutral-900 dark:text-neutral-100'
                            }`}
                          >
                            {val}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Clickable Seller Storefront Card */}
          {product.seller ? (
            <Pressable
              onPress={() => {
                if (product.seller?.store_link) {
                  router.push({
                    pathname: '/store/[slug]',
                    params: { slug: product.seller.store_link },
                  });
                }
              }}
              className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex-row items-center gap-3 rounded-2xl border p-4 active:opacity-85"
            >
              {product.seller.logo_url ? (
                <Image
                  source={{ uri: product.seller.logo_url }}
                  style={{ width: 48, height: 48, borderRadius: 16 }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900">
                  <Text className="text-lg font-bold text-white">
                    {product.seller.store_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-muted dark:text-muted-dark text-[11px] font-medium uppercase tracking-wider">
                  Sold by Verified Storefront
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    {product.seller.store_name}
                  </Text>
                  {product.seller.is_verified ? (
                    <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                  ) : null}
                </View>
                {product.seller.store_link ? (
                  <Text className="text-muted dark:text-muted-dark text-xs">
                    @{product.seller.store_link}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1 rounded-full bg-black px-3 py-1.5 dark:bg-white">
                <Text className="text-xs font-medium text-white dark:text-black">Visit Store</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.dark ? '#000' : '#fff'} />
              </View>
            </Pressable>
          ) : null}

          {/* Description */}
          <View className="border-border dark:border-border-dark gap-2 border-t pt-4">
            <Text className="text-sm font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
              Product Description
            </Text>
            <Text className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
              {product.description || 'No description provided for this item.'}
            </Text>
          </View>

          {/* Customer Reviews Section */}
          <View className="border-border dark:border-border-dark gap-3 border-t pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
                Customer Reviews ({reviewSummary?.count ?? 0})
              </Text>
              {reviewSummary && reviewSummary.count > 0 ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {reviewSummary.average.toFixed(1)} / 5.0
                  </Text>
                </View>
              ) : null}
            </View>

            {reviews.length === 0 ? (
              <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark rounded-2xl border p-4">
                <Text className="text-muted dark:text-muted-dark text-xs">
                  No verified customer reviews yet for this product.
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {reviews.map((rev: Review) => (
                  <View
                    key={rev.id}
                    className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark gap-1.5 rounded-2xl border p-3.5"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {rev.buyer?.full_name || 'Verified Buyer'}
                        </Text>
                        {rev.verified_purchase ? (
                          <View className="flex-row items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5">
                            <Ionicons name="checkmark-circle" size={11} color="#059669" />
                            <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              Verified
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-muted dark:text-muted-dark text-[11px]">
                        {formatDate(rev.created_at)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= rev.rating ? 'star' : 'star-outline'}
                          size={13}
                          color="#f59e0b"
                        />
                      ))}
                    </View>
                    {rev.title ? (
                      <Text className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {rev.title}
                      </Text>
                    ) : null}
                    {rev.body ? (
                      <Text className="text-xs leading-5 text-neutral-700 dark:text-neutral-300">
                        {rev.body}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Recently Viewed Rail */}
          {otherRecent.length > 0 ? (
            <View className="border-border dark:border-border-dark gap-3 border-t pt-4">
              <Text className="text-sm font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
                Recently Viewed
              </Text>
              <FlatList
                horizontal
                data={otherRecent.slice(0, 8)}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3"
                renderItem={({ item }) => (
                  <View style={{ width: 165 }}>
                    <ProductCard product={item} />
                  </View>
                )}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating Bottom Bar with Quantity + Add to Cart + Buy Now */}
      <View className="border-border dark:border-border-dark absolute bottom-0 left-0 right-0 border-t bg-white/95 px-4 py-3 dark:bg-neutral-950/95">
        <View className="flex-row items-center gap-2.5">
          {/* Quantity Stepper */}
          <View className="border-border dark:border-border-dark flex-row items-center rounded-xl border">
            <Pressable
              disabled={quantity <= 1}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-12 w-9 items-center justify-center"
            >
              <Ionicons
                name="remove"
                size={17}
                color={quantity <= 1 ? colors.muted : colors.foreground}
              />
            </Pressable>
            <Text className="min-w-5 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {quantity}
            </Text>
            <Pressable
              disabled={quantity >= availableStock}
              onPress={() => setQuantity((q) => q + 1)}
              className="h-12 w-9 items-center justify-center"
            >
              <Ionicons name="add" size={17} color={colors.foreground} />
            </Pressable>
          </View>

          <Button
            title={addedToast ? '✓ Added' : isOutOfStock ? 'Sold out' : 'Add to Cart'}
            disabled={isOutOfStock}
            variant="outline"
            onPress={handleAddToCart}
            className="flex-1"
            icon="bag-add-outline"
          />

          {!isOutOfStock ? (
            <Button
              title="Buy Now"
              variant="secondary"
              onPress={handleBuyNow}
              className="flex-1"
              icon="flash-outline"
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
