import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { ListSkeleton } from '@/components/skeleton';
import { Badge, EmptyState, ErrorState, useThemeColors } from '@/components/ui';
import { orderApi, type Order } from '@/lib/api';
import { formatDate, formatPrice, humanizeStatus, shortOrderId } from '@/lib/format';

function statusTone(status: string): 'neutral' | 'accent' | 'success' | 'warning' {
  switch (status) {
    case 'DELIVERED':
    case 'CONFIRMED':
      return 'success';
    case 'PENDING':
    case 'PROCESSING':
    case 'ON THE WAY':
    case 'AVAILABLE FOR PICKUP':
      return 'warning';
    case 'CANCELLED':
    case 'RETURNED':
    case 'REFUNDED':
      return 'accent';
    default:
      return 'neutral';
  }
}

function OrderCard({ order }: { order: Order }) {
  const colors = useThemeColors();
  const firstItem = order.items?.[0];
  const itemCount = order.items?.reduce((n, i) => n + i.quantity, 0) || 0;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
      className="border-border dark:border-border-dark gap-3 rounded-2xl border bg-white p-4 active:opacity-85 dark:bg-neutral-900"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="font-bold text-neutral-900 dark:text-neutral-100">
            Order #{shortOrderId(order.id)}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-xs">
            • {formatDate(order.created_at)}
          </Text>
        </View>
        <Badge label={humanizeStatus(order.status)} tone={statusTone(order.status)} />
      </View>

      {/* Items Preview */}
      <View className="flex-row items-center gap-3">
        {firstItem?.product?.image_urls?.[0] ? (
          <Image
            source={{ uri: firstItem.product.image_urls[0] }}
            style={{ width: 56, height: 56, borderRadius: 12 }}
            contentFit="cover"
          />
        ) : (
          <View className="bg-surface dark:bg-surface-dark h-14 w-14 items-center justify-center rounded-xl">
            <Ionicons name="bag-outline" size={24} color={colors.muted} />
          </View>
        )}
        <View className="flex-1">
          <Text numberOfLines={1} className="font-semibold text-neutral-900 dark:text-neutral-100">
            {firstItem?.product?.title || 'Order Item'}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-xs">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {formatPrice(order.total_amount)}
          </Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Text className="text-muted dark:text-muted-dark text-xs font-medium">Details</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.muted} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function OrdersList() {
  const colors = useThemeColors();
  const q = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: orderApi.mine,
  });

  if (q.isPending) return <ListSkeleton rows={4} />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;

  const orders = q.data ?? [];

  if (orders.length === 0) {
    return (
      <EmptyState
        icon="receipt-outline"
        title="No orders yet"
        message="When you place orders, they will appear here so you can track status and delivery."
        action={{ title: 'Explore items', onPress: () => router.navigate('/') }}
      />
    );
  }

  return (
    <FlatList
      className="bg-white dark:bg-neutral-950"
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerClassName="p-4 gap-4 pb-12"
      renderItem={({ item }) => <OrderCard order={item} />}
      refreshControl={
        <RefreshControl
          refreshing={q.isRefetching}
          onRefresh={() => {
            void q.refetch();
          }}
          tintColor={colors.foreground}
        />
      }
    />
  );
}

export default function OrdersScreen() {
  return (
    <RequireAuth title="Your orders" message="Sign in to view your order history.">
      <OrdersList />
    </RequireAuth>
  );
}
