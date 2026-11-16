import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { ListSkeleton } from '@/components/skeleton';
import { Badge, Button, EmptyState, ErrorState, useThemeColors } from '@/components/ui';
import { orderApi } from '@/lib/api';
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

function OrderDetailContent({ orderId }: { orderId: string }) {
  const colors = useThemeColors();
  const qc = useQueryClient();
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.byId(orderId),
    enabled: !!orderId,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => orderApi.cancel(orderId, reason),
    onSuccess: () => {
      Alert.alert('Order Cancelled', 'Your order has been cancelled.');
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message || 'Failed to cancel order.');
    },
  });

  if (isPending) return <ListSkeleton rows={4} />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!order) return <EmptyState icon="alert-circle-outline" title="Order not found" />;

  const seller = order.items?.[0]?.product?.seller;
  const isPaid = order.transaction?.status === 'SUCCESS';
  const isPendingPayment = !isPaid && order.status !== 'CANCELLED';

  const handleRetryPayment = async () => {
    setIsRetryingPayment(true);
    try {
      const res = await orderApi.retryPayment(order.id);
      if (res.authorization_url) {
        await WebBrowser.openAuthSessionAsync(res.authorization_url, 'verndly://');
        if (res.reference) {
          try {
            await orderApi.verifyPayment(res.reference, order.id);
          } catch {
            // let refetch pick up DB status
          }
        }
        refetch();
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Could not initiate payment retry.');
    } finally {
      setIsRetryingPayment(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel order?', 'Are you sure you want to cancel this order?', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: () => cancelMutation.mutate('Buyer requested cancellation'),
      },
    ]);
  };

  const handleWhatsAppSeller = () => {
    if (!seller?.whatsapp_number) return;
    const clean = seller.whatsapp_number.replace(/[^\d]/g, '');
    const url = `https://wa.me/${clean}?text=Hi! I have a question regarding order %23${shortOrderId(order.id)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="p-4 gap-6 pb-20"
    >
      {/* Header status */}
      <View className="border-border dark:border-border-dark gap-3 rounded-2xl border p-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Order #{shortOrderId(order.id)}
          </Text>
          <Badge label={humanizeStatus(order.status)} tone={statusTone(order.status)} />
        </View>
        <Text className="text-muted dark:text-muted-dark text-xs">
          Placed on {formatDate(order.created_at)}
        </Text>

        {/* Payment Warning / Banner */}
        {isPendingPayment && order.transaction ? (
          <View className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/40">
            <Text className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Payment Status: {humanizeStatus(order.transaction.status)}
            </Text>
            <Text className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
              Payment was not completed. Tap below to pay and confirm your order.
            </Text>
            <Button
              title="Pay Now"
              onPress={handleRetryPayment}
              loading={isRetryingPayment}
              className="mt-3 h-10 bg-amber-600"
            />
          </View>
        ) : null}
      </View>

      {/* Seller info */}
      {seller ? (
        <View className="border-border dark:border-border-dark gap-3 rounded-2xl border p-4">
          <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-wider">
            Vendor
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              {seller.logo_url ? (
                <Image
                  source={{ uri: seller.logo_url }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              ) : (
                <View className="bg-surface dark:bg-surface-dark h-10 w-10 items-center justify-center rounded-full">
                  <Ionicons name="storefront-outline" size={20} color={colors.muted} />
                </View>
              )}
              <Text className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {seller.store_name}
              </Text>
            </View>

            {seller.whatsapp_number ? (
              <Pressable
                onPress={handleWhatsAppSeller}
                className="flex-row items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 dark:bg-green-950"
              >
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
                <Text className="text-xs font-semibold text-green-700 dark:text-green-400">
                  Chat
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Items list */}
      <View className="border-border dark:border-border-dark gap-4 rounded-2xl border p-4">
        <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-wider">
          Items Ordered ({order.items.length})
        </Text>
        <View className="gap-3">
          {order.items.map((item) => (
            <View key={item.id} className="flex-row gap-3">
              {item.product?.image_urls?.[0] ? (
                <Image
                  source={{ uri: item.product.image_urls[0] }}
                  style={{ width: 60, height: 60, borderRadius: 12 }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-15 w-15 bg-surface dark:bg-surface-dark items-center justify-center rounded-xl">
                  <Ionicons name="bag-outline" size={20} color={colors.muted} />
                </View>
              )}
              <View className="flex-1 justify-between py-0.5">
                <Text
                  numberOfLines={2}
                  className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  {item.product?.title || 'Product'}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-muted dark:text-muted-dark text-xs">
                    Qty: {item.quantity}
                  </Text>
                  <Text className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View className="border-border dark:border-border-dark flex-row items-center justify-between border-t pt-3">
          <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
            Total Paid / Due
          </Text>
          <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {formatPrice(order.total_amount)}
          </Text>
        </View>
      </View>

      {/* Delivery & Customer details */}
      <View className="border-border dark:border-border-dark gap-3 rounded-2xl border p-4">
        <Text className="text-muted dark:text-muted-dark text-xs font-bold uppercase tracking-wider">
          Delivery Details
        </Text>
        <View className="gap-1.5 text-sm">
          <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
            {order.customer_name || 'Customer'}
          </Text>
          {order.customer_phone ? (
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              {order.customer_phone}
            </Text>
          ) : null}
          <Text className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            Method: <Text className="font-medium">{order.delivery_method || 'Pickup'}</Text>
          </Text>
          {order.delivery_location ? (
            <Text className="text-sm text-neutral-700 dark:text-neutral-300">
              Location: <Text className="font-medium">{order.delivery_location}</Text>
            </Text>
          ) : null}
          {order.delivery_notes ? (
            <Text className="text-muted dark:text-muted-dark mt-1 text-xs">
              Note: {order.delivery_notes}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Cancel action if order is pending */}
      {order.status === 'PENDING' ? (
        <Button
          title="Cancel Order"
          variant="danger"
          onPress={handleCancel}
          loading={cancelMutation.isPending}
        />
      ) : null}
    </ScrollView>
  );
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <RequireAuth
      title="Sign in to view order"
      message="You must be signed in to see order details."
    >
      <OrderDetailContent orderId={id!} />
    </RequireAuth>
  );
}
