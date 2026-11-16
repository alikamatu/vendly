import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { Divider, useThemeColors } from '@/components/ui';
import { WEB_URL } from '@/lib/config';
import { useAuth } from '@/providers/auth-provider';
import { useThemeMode } from '@/providers/theme-provider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Row({
  icon,
  iconBg,
  iconColor,
  label,
  subtitle,
  onPress,
  danger,
  rightText,
}: {
  icon: IconName;
  iconBg?: string;
  iconColor?: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  rightText?: string;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      className="active:bg-surface dark:active:bg-surface-dark flex-row items-center gap-3.5 px-4 py-3.5"
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-xl ${
          iconBg ?? (danger ? 'bg-red-500/10' : 'bg-surface dark:bg-surface-dark')
        }`}
      >
        <Ionicons
          name={icon}
          size={18}
          color={danger ? '#ef4444' : (iconColor ?? colors.foreground)}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${
            danger ? 'text-red-500' : 'text-neutral-900 dark:text-neutral-100'
          }`}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-muted dark:text-muted-dark text-xs">{subtitle}</Text>
        ) : null}
      </View>
      {rightText ? (
        <Text className="text-muted dark:text-muted-dark text-xs font-medium capitalize">
          {rightText}
        </Text>
      ) : null}
      {!danger ? <Ionicons name="chevron-forward" size={17} color={colors.muted} /> : null}
    </Pressable>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      {title ? (
        <Text className="text-muted dark:text-muted-dark px-1 text-[11px] font-bold uppercase tracking-widest">
          {title}
        </Text>
      ) : null}
      <View className="border-border dark:border-border-dark overflow-hidden rounded-2xl border bg-white dark:bg-neutral-900">
        {children}
      </View>
    </View>
  );
}

function AccountContent() {
  const { user, logout } = useAuth();
  const { mode, toggle: toggleTheme } = useThemeMode();
  const openWeb = (path: string) => WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);
  const go = (href: Href) => router.push(href);

  const confirmLogout = () =>
    Alert.alert('Sign out?', 'You can sign back in at any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);

  const initials = (user?.full_name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="gap-5 p-4 pb-12"
    >
      <View className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex-row items-center gap-3.5 rounded-3xl border p-4">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-black dark:bg-white">
          <Text className="text-xl font-bold text-white dark:text-black">{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {user?.full_name}
          </Text>
          <Text className="text-muted dark:text-muted-dark text-xs">{user?.email}</Text>
          <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5">
            <View className="rounded-full bg-neutral-200 px-2.5 py-0.5 dark:bg-neutral-800">
              <Text className="text-[10px] font-medium uppercase text-neutral-800 dark:text-neutral-200">
                {user?.role ?? 'Buyer'}
              </Text>
            </View>
            {user?.is_verified ? (
              <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5">
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  Verified
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={() => go('/account/profile')}
          className="border-border dark:border-border-dark rounded-full border bg-white px-3.5 py-1.5 dark:bg-neutral-900"
        >
          <Text className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Edit</Text>
        </Pressable>
      </View>

      {/* Start Selling / Seller Dashboard CTA */}
      <Pressable
        onPress={() => openWeb(user?.role === 'SELLER' ? '/dashboard' : '/onboarding')}
        className="flex-row items-center justify-between rounded-3xl bg-neutral-900 p-4 active:opacity-90 dark:bg-neutral-800"
      >
        <View className="flex-1 flex-row items-center gap-3 pr-2">
          <View className="bg-accent h-11 w-11 items-center justify-center rounded-2xl">
            <Ionicons name="storefront" size={20} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-white">
              {user?.role === 'SELLER' ? 'Open Seller Dashboard' : 'Start selling on Verndly'}
            </Text>
            <Text className="text-xs text-white/75">
              {user?.role === 'SELLER'
                ? 'Manage products, payouts & analytics'
                : 'Launch your verified online storefront in minutes'}
            </Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </Pressable>

      <Section title="Shopping & Activity">
        <Row
          icon="receipt-outline"
          iconBg="bg-blue-500/10"
          iconColor="#3b82f6"
          label="My Orders"
          subtitle="Track deliveries, receipts & status"
          onPress={() => go('/orders')}
        />
        <Divider />
        <Row
          icon="heart-outline"
          iconBg="bg-rose-500/10"
          iconColor="#f43f5e"
          label="Saved Items"
          subtitle="Your favorited products"
          onPress={() => go('/favorites')}
        />
        <Divider />
        <Row
          icon="notifications-outline"
          iconBg="bg-amber-500/10"
          iconColor="#f59e0b"
          label="Notifications"
          subtitle="Order updates & marketplace alerts"
          onPress={() => go('/notifications')}
        />
        <Divider />
        <Row
          icon="grid-outline"
          iconBg="bg-indigo-500/10"
          iconColor="#6366f1"
          label="Categories & Brands"
          subtitle="Explore departments, tags & verified labels"
          onPress={() => go('/categories')}
        />
      </Section>

      <Section title="Account Settings">
        <Row
          icon="person-outline"
          iconBg="bg-emerald-500/10"
          iconColor="#059669"
          label="Personal Details"
          subtitle="Name, phone & contact info"
          onPress={() => go('/account/profile')}
        />
        <Divider />
        <Row
          icon="location-outline"
          iconBg="bg-purple-500/10"
          iconColor="#8b5cf6"
          label="Saved Addresses"
          subtitle="Manage delivery locations for fast checkout"
          onPress={() => go('/account/addresses')}
        />
        <Divider />
        <Row
          icon={mode === 'dark' ? 'moon-outline' : 'sunny-outline'}
          iconBg="bg-neutral-500/10"
          label="Appearance"
          subtitle="Tap to switch between Light and Dark theme"
          rightText={mode}
          onPress={toggleTheme}
        />
        <Divider />
        <Row
          icon="shield-checkmark-outline"
          iconBg="bg-indigo-500/10"
          iconColor="#6366f1"
          label="Security & 2FA"
          subtitle="Two-factor authentication & password"
          onPress={() => openWeb('/account/security')}
        />
      </Section>

      <Section title="Support & Legal">
        <Row icon="help-circle-outline" label="Help & Support" onPress={() => openWeb('/help')} />
        <Divider />
        <Row
          icon="document-text-outline"
          label="Terms & Privacy"
          onPress={() => openWeb('/terms')}
        />
      </Section>

      <Section>
        <Row icon="log-out-outline" label="Sign out" danger onPress={confirmLogout} />
      </Section>
    </ScrollView>
  );
}

export default function AccountScreen() {
  return (
    <RequireAuth
      title="Your Verndly account"
      message="Sign in to track orders, save items, and manage your details."
    >
      <AccountContent />
    </RequireAuth>
  );
}
