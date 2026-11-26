import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { Button, EmptyState, TextField, useThemeColors } from '@/components/ui';
import { addressApi, orderApi, storeApi } from '@/lib/api';
import { formatPrice, normalizeGhanaPhone, sanitizePhoneInput } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';

function CheckoutForm({ storeLink }: { storeLink: string }) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const { groups, removeStore } = useCart();

  const group = groups.find((g) => g.storeLink === storeLink);

  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(sanitizePhoneInput(user?.phone_e164 || ''));
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryLocation, setDeliveryLocation] = useState('Store Pickup');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PAYSTACK' | 'CASH_ON_DELIVERY'>('PAYSTACK');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load store details to check payment timing policies
  const storeQuery = useQuery({
    queryKey: ['store', storeLink],
    queryFn: () => storeApi.bySlug(storeLink),
    enabled: !!storeLink,
  });

  // Load saved addresses
  const addressesQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: addressApi.list,
  });

  useEffect(() => {
    if (storeQuery.data?.payment_timing) {
      const timing = storeQuery.data.payment_timing;
      if (timing === 'UPFRONT_ONLY') setPaymentMethod('PAYSTACK');
      else if (timing === 'DELIVERY_ONLY') setPaymentMethod('CASH_ON_DELIVERY');
    }
  }, [storeQuery.data]);

  useEffect(() => {
    if (deliveryMethod === 'PICKUP') {
      setDeliveryLocation('Store Pickup');
    } else {
      const defaultAddr =
        addressesQuery.data?.find((a) => a.is_default) || addressesQuery.data?.[0];
      if (defaultAddr) {
        setDeliveryLocation(`${defaultAddr.street}, ${defaultAddr.city}`);
        if (!customerName) setCustomerName(defaultAddr.name);
        if (!customerPhone) setCustomerPhone(sanitizePhoneInput(defaultAddr.phone));
      } else {
        setDeliveryLocation('');
      }
    }
  }, [deliveryMethod, addressesQuery.data]);

  if (!group || group.items.length === 0) {
    return (
      <EmptyState
        icon="bag-outline"
        title="No items to checkout"
        message="Your cart for this store is empty."
        action={{ title: 'Return to cart', onPress: () => router.back() }}
      />
    );
  }

  const handleSubmit = async () => {
    if (!customerName.trim() || customerName.trim().length < 2) {
      setError('Please provide your name.');
      return;
    }
    const cleanPhone = normalizeGhanaPhone(customerPhone);
    if (!cleanPhone) {
      setError('Please provide a valid Ghana phone number (e.g. 024 123 4567).');
      return;
    }
    if (
      deliveryMethod === 'DELIVERY' &&
      (!deliveryLocation.trim() || deliveryLocation === 'Store Pickup')
    ) {
      setError('Please provide a delivery address.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await orderApi.create(
        storeLink,
        group.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId ?? null,
          quantity: i.quantity,
        })),
        {
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          deliveryMethod,
          deliveryLocation: deliveryLocation.trim(),
          deliveryNotes: deliveryNotes.trim() || undefined,
          paymentMethod,
        },
      );

      const orderId = result.orderId || result.id;
      removeStore(storeLink);

      // Handle Online Paystack Payment
      if (result.authorization_url && orderId) {
        try {
          await WebBrowser.openAuthSessionAsync(result.authorization_url, 'verndly://');

          if (result.reference) {
            try {
              await orderApi.verifyPayment(result.reference, orderId);
            } catch {
              // verification error logged or handled by backend webhook
            }
          }
        } catch {
          // If in-app browser was cancelled or failed, continue to order details
        }
      }

      if (orderId) {
        router.replace({ pathname: '/orders/[id]', params: { id: orderId } });
      } else {
        router.replace('/orders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timing = storeQuery.data?.payment_timing || 'BOTH';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-white dark:bg-neutral-950"
        contentContainerClassName="p-4 gap-6 pb-24"
        keyboardShouldPersistTaps="handled"
      >
        {/* Store & Order Summary */}
        <View className="border-border dark:border-border-dark gap-3 rounded-2xl border p-4">
          <Text className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Order Summary — {group.storeName}
          </Text>
          <View className="gap-2">
            {group.items.map((i) => (
              <View key={i.productId} className="flex-row items-center justify-between">
                <Text
                  numberOfLines={1}
                  className="flex-1 text-sm text-neutral-800 dark:text-neutral-200"
                >
                  {i.quantity}x {i.title}
                </Text>
                <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatPrice(Number(i.price) * i.quantity)}
                </Text>
              </View>
            ))}
          </View>
          <View className="border-border dark:border-border-dark flex-row items-center justify-between border-t pt-3">
            <Text className="font-bold text-neutral-900 dark:text-neutral-100">Total</Text>
            <Text className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100">
              {formatPrice(group.totalPrice)}
            </Text>
          </View>
        </View>

        {error ? (
          <View className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
            <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
          </View>
        ) : null}

        {/* Contact Information */}
        <View className="gap-4">
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Contact Details
          </Text>
          <TextField
            label="Your Name"
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Kofi Mensah"
          />
          <TextField
            label="Phone Number"
            value={customerPhone}
            onChangeText={(value) => setCustomerPhone(sanitizePhoneInput(value))}
            placeholder="0241234567"
            maxLength={10}
            keyboardType="phone-pad"
            hint="For pickup/delivery coordination"
          />
        </View>

        {/* Delivery Method */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Delivery Option
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setDeliveryMethod('PICKUP')}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border p-4 ${
                deliveryMethod === 'PICKUP'
                  ? 'border-black bg-black dark:border-white dark:bg-white'
                  : 'border-border dark:border-border-dark'
              }`}
            >
              <Ionicons
                name="storefront-outline"
                size={20}
                color={
                  deliveryMethod === 'PICKUP' ? (colors.dark ? '#000' : '#fff') : colors.foreground
                }
              />
              <Text
                className={`font-semibold ${
                  deliveryMethod === 'PICKUP'
                    ? 'text-white dark:text-black'
                    : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                Store Pickup
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDeliveryMethod('DELIVERY')}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border p-4 ${
                deliveryMethod === 'DELIVERY'
                  ? 'border-black bg-black dark:border-white dark:bg-white'
                  : 'border-border dark:border-border-dark'
              }`}
            >
              <Ionicons
                name="bicycle-outline"
                size={20}
                color={
                  deliveryMethod === 'DELIVERY'
                    ? colors.dark
                      ? '#000'
                      : '#fff'
                    : colors.foreground
                }
              />
              <Text
                className={`font-semibold ${
                  deliveryMethod === 'DELIVERY'
                    ? 'text-white dark:text-black'
                    : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                Delivery
              </Text>
            </Pressable>
          </View>

          {deliveryMethod === 'DELIVERY' ? (
            <View className="gap-3 pt-2">
              <TextField
                label="Delivery Address / Landmark"
                value={deliveryLocation}
                onChangeText={setDeliveryLocation}
                placeholder="Hall 4, Room B12 / University Campus"
              />
              <TextField
                label="Delivery Notes (optional)"
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
                placeholder="Call when you arrive at the gate"
              />
            </View>
          ) : null}
        </View>

        {/* Payment Method */}
        <View className="gap-3">
          <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Payment Method
          </Text>

          {timing !== 'DELIVERY_ONLY' ? (
            <Pressable
              onPress={() => setPaymentMethod('PAYSTACK')}
              className={`flex-row items-center justify-between rounded-xl border p-4 ${
                paymentMethod === 'PAYSTACK'
                  ? 'border-black bg-black/5 dark:border-white dark:bg-white/5'
                  : 'border-border dark:border-border-dark'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="card-outline" size={22} color={colors.foreground} />
                <View>
                  <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Pay Online (Paystack)
                  </Text>
                  <Text className="text-muted dark:text-muted-dark text-xs">
                    Mobile Money (MTN, Telecel, AT) or Cards
                  </Text>
                </View>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border ${
                  paymentMethod === 'PAYSTACK'
                    ? 'border-black bg-black dark:border-white dark:bg-white'
                    : 'border-neutral-400'
                }`}
              >
                {paymentMethod === 'PAYSTACK' ? (
                  <View className="h-2 w-2 rounded-full bg-white dark:bg-black" />
                ) : null}
              </View>
            </Pressable>
          ) : null}

          {timing !== 'UPFRONT_ONLY' ? (
            <Pressable
              onPress={() => setPaymentMethod('CASH_ON_DELIVERY')}
              className={`flex-row items-center justify-between rounded-xl border p-4 ${
                paymentMethod === 'CASH_ON_DELIVERY'
                  ? 'border-black bg-black/5 dark:border-white dark:bg-white/5'
                  : 'border-border dark:border-border-dark'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="cash-outline" size={22} color={colors.foreground} />
                <View>
                  <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Pay on Delivery / Pickup
                  </Text>
                  <Text className="text-muted dark:text-muted-dark text-xs">
                    Cash handover when receiving item
                  </Text>
                </View>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border ${
                  paymentMethod === 'CASH_ON_DELIVERY'
                    ? 'border-black bg-black dark:border-white dark:bg-white'
                    : 'border-neutral-400'
                }`}
              >
                {paymentMethod === 'CASH_ON_DELIVERY' ? (
                  <View className="h-2 w-2 rounded-full bg-white dark:bg-black" />
                ) : null}
              </View>
            </Pressable>
          ) : null}
        </View>

        <Button
          title={
            isSubmitting
              ? 'Processing...'
              : paymentMethod === 'PAYSTACK'
                ? `Pay ${formatPrice(group.totalPrice)} Now`
                : `Place Order (${formatPrice(group.totalPrice)})`
          }
          loading={isSubmitting}
          onPress={handleSubmit}
          className="mt-2"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function CheckoutScreen() {
  const { storeLink } = useLocalSearchParams<{ storeLink: string }>();

  return (
    <RequireAuth title="Sign in to checkout" message="Please sign in to place your order.">
      <CheckoutForm storeLink={storeLink!} />
    </RequireAuth>
  );
}
