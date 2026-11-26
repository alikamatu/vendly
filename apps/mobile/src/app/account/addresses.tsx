import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequireAuth } from '@/components/require-auth';
import { ListSkeleton } from '@/components/skeleton';
import { Badge, Button, EmptyState, ErrorState, TextField, useThemeColors } from '@/components/ui';
import { addressApi, type Address } from '@/lib/api';
import { sanitizePhoneInput } from '@/lib/format';

function AddressesManager() {
  const colors = useThemeColors();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const [label, setLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');

  const listQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: addressApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      addressApi.create({
        label: label.trim() || 'Home',
        name: recipientName.trim(),
        phone: phone.trim(),
        street: street.trim(),
        city: city.trim(),
        region: region.trim() || null,
        is_default: (listQuery.data ?? []).length === 0,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['addresses'] });
      setModalOpen(false);
      setRecipientName('');
      setPhone('');
      setStreet('');
      setCity('');
      setRegion('');
    },
    onError: (err: any) => {
      Alert.alert('Could not save address', err?.message ?? 'Please check the fields.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => addressApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  if (listQuery.isPending) return <ListSkeleton rows={4} />;
  if (listQuery.isError) {
    return <ErrorState message={listQuery.error.message} onRetry={() => listQuery.refetch()} />;
  }

  const addresses: Address[] = listQuery.data ?? [];

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <FlatList
        data={addresses}
        keyExtractor={(a) => a.id}
        contentContainerClassName="gap-3 p-4 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isRefetching}
            onRefresh={() => {
              void listQuery.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <View className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark gap-1.5 rounded-2xl border p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {item.label || 'Address'}
                </Text>
                {item.is_default ? <Badge label="Default" tone="success" /> : null}
              </View>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  Alert.alert('Delete address?', 'Remove this saved address?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => removeMutation.mutate(item.id),
                    },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
            <Text className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {item.name} · {item.phone}
            </Text>
            <Text className="text-muted dark:text-muted-dark text-xs">
              {item.street}
              {item.city ? `, ${item.city}` : ''}
              {item.region ? `, ${item.region}` : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="location-outline"
            title="No saved addresses"
            message="Save your delivery address for one-tap checkout."
            action={{ title: 'Add Address', onPress: () => setModalOpen(true) }}
          />
        }
      />

      {addresses.length > 0 ? (
        <View className="border-border dark:border-border-dark absolute bottom-0 left-0 right-0 border-t bg-white/95 p-4 dark:bg-neutral-950/95">
          <Button
            title="Add New Address"
            icon="add-circle-outline"
            onPress={() => setModalOpen(true)}
          />
        </View>
      ) : null}

      <Modal
        visible={modalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
          <View className="border-border dark:border-border-dark flex-row items-center justify-between border-b px-4 py-3.5">
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              New Delivery Address
            </Text>
            <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
            <TextField
              label="Label (e.g. Home, Office)"
              value={label}
              onChangeText={setLabel}
              placeholder="Home"
            />
            <TextField
              label="Recipient full name"
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Kwame Mensah"
            />
            <TextField
              label="Phone number"
              value={phone}
              onChangeText={(value) => setPhone(sanitizePhoneInput(value))}
              placeholder="0241234567"
              maxLength={10}
              keyboardType="phone-pad"
            />
            <TextField
              label="Street address / Landmark"
              value={street}
              onChangeText={setStreet}
              placeholder="East Legon, Boundary Road"
            />
            <TextField
              label="City / Town"
              value={city}
              onChangeText={setCity}
              placeholder="Accra"
            />
            <TextField
              label="Region (optional)"
              value={region}
              onChangeText={setRegion}
              placeholder="Greater Accra"
            />
            <Button
              title="Save Address"
              loading={createMutation.isPending}
              onPress={() => {
                if (!recipientName.trim() || !phone.trim() || !street.trim() || !city.trim()) {
                  Alert.alert(
                    'Missing fields',
                    'Please fill in recipient name, phone, street, and city.',
                  );
                  return;
                }
                createMutation.mutate();
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export default function AddressesScreen() {
  return (
    <RequireAuth title="Saved addresses" message="Sign in to manage your delivery addresses.">
      <AddressesManager />
    </RequireAuth>
  );
}
