import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, EmptyState, useThemeColors } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { cartKey, useCart, type CartItem } from '@/providers/cart-provider';

function QuantityStepper({ item }: { item: CartItem }) {
  const { updateQuantity } = useCart();
  const colors = useThemeColors();
  const key = cartKey(item.productId, item.variantId);
  return (
    <View className="border-border dark:border-border-dark flex-row items-center rounded-full border">
      <Pressable
        hitSlop={6}
        accessibilityLabel="Decrease quantity"
        onPress={() => updateQuantity(key, item.quantity - 1)}
        className="h-8 w-8 items-center justify-center"
      >
        <Ionicons
          name={item.quantity === 1 ? 'trash-outline' : 'remove'}
          size={16}
          color={colors.foreground}
        />
      </Pressable>
      <Text className="min-w-6 text-center font-semibold text-neutral-900 dark:text-neutral-100">
        {item.quantity}
      </Text>
      <Pressable
        hitSlop={6}
        accessibilityLabel="Increase quantity"
        onPress={() => updateQuantity(key, item.quantity + 1)}
        className="h-8 w-8 items-center justify-center"
      >
        <Ionicons name="add" size={16} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

export default function CartScreen() {
  const { groups, itemCount } = useCart();

  if (itemCount === 0) {
    return (
      <EmptyState
        icon="bag-outline"
        title="Your cart is empty"
        message="Items you add will show up here, grouped by store."
        action={{ title: 'Start shopping', onPress: () => router.navigate('/') }}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="gap-4 p-4 pb-10"
    >
      <Text className="text-muted dark:text-muted-dark text-sm">
        Each store is checked out separately.
      </Text>
      {groups.map((group) => (
        <View
          key={group.storeLink}
          className="border-border dark:border-border-dark gap-4 rounded-2xl border p-4"
        >
          <View className="flex-row items-center gap-2">
            {group.logoUrl ? (
              <Image
                source={{ uri: group.logoUrl }}
                style={{ width: 24, height: 24, borderRadius: 12 }}
              />
            ) : (
              <Ionicons name="storefront-outline" size={20} color="#6b7280" />
            )}
            <Text className="flex-1 font-semibold text-neutral-900 dark:text-neutral-100">
              {group.storeName}
            </Text>
          </View>

          {group.items.map((item) => (
            <View key={cartKey(item.productId, item.variantId)} className="flex-row gap-3">
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/product/[id]', params: { id: item.productId } })
                }
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: 72, height: 72, borderRadius: 12 }}
                  contentFit="cover"
                />
              </Pressable>
              <View className="flex-1 justify-between">
                <View>
                  <Text
                    numberOfLines={2}
                    className="text-sm text-neutral-900 dark:text-neutral-100"
                  >
                    {item.title}
                  </Text>
                  {item.variantLabel ? (
                    <Text className="text-muted dark:text-muted-dark text-xs">
                      {item.variantLabel}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="font-bold text-neutral-900 dark:text-neutral-100">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </Text>
                  <QuantityStepper item={item} />
                </View>
              </View>
            </View>
          ))}

          <View className="border-border dark:border-border-dark flex-row items-center justify-between border-t pt-3">
            <Text className="text-muted dark:text-muted-dark">
              Subtotal ({group.totalItems} {group.totalItems === 1 ? 'item' : 'items'})
            </Text>
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {formatPrice(group.totalPrice)}
            </Text>
          </View>
          <Button
            title="Checkout"
            onPress={() =>
              router.push({
                pathname: '/checkout/[storeLink]',
                params: { storeLink: group.storeLink },
              })
            }
          />
        </View>
      ))}
    </ScrollView>
  );
}
