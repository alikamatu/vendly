import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

const verndlyLogo = require('../../assets/verndly-logo.png');

interface AuthHeaderProps {
  currentTab: 'login' | 'register';
  title?: string;
  subtitle?: string;
}

export function AuthHeader({ currentTab, title, subtitle }: AuthHeaderProps) {
  const router = useRouter();

  return (
    <View className="gap-5">
      {/* Brand & Platform Badge */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <Image
            source={verndlyLogo}
            style={{ width: 34, height: 34, borderRadius: 8 }}
            contentFit="contain"
          />
          <View>
            <Text className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Verndly
            </Text>
            <Text className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              Commerce for the Next Gen
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Verified
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Close"
            className="border-border bg-surface dark:border-border-dark dark:bg-surface-dark h-8 w-8 items-center justify-center rounded-full border active:opacity-75"
          >
            <Ionicons name="close" size={18} color="#888888" />
          </Pressable>
        </View>
      </View>

      {/* Screen Title & Subtitle */}
      {title ? (
        <View className="gap-1.5">
          <Text className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-muted dark:text-muted-dark text-xs leading-5">{subtitle}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Segmented Auth Switcher */}
      <View className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex-row rounded-2xl border p-1">
        <Pressable
          onPress={() => {
            if (currentTab !== 'login') router.replace('/login');
          }}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
            currentTab === 'login' ? 'shadow-xs bg-black dark:bg-white' : 'bg-transparent'
          }`}
        >
          <Ionicons
            name="log-in-outline"
            size={16}
            color={currentTab === 'login' ? '#ffffff' : '#888888'}
          />
          <Text
            className={`text-xs font-semibold ${
              currentTab === 'login'
                ? 'text-white dark:text-black'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Sign in
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (currentTab !== 'register') router.replace('/register');
          }}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
            currentTab === 'register' ? 'shadow-xs bg-black dark:bg-white' : 'bg-transparent'
          }`}
        >
          <Ionicons
            name="person-add-outline"
            size={16}
            color={currentTab === 'register' ? '#ffffff' : '#888888'}
          />
          <Text
            className={`text-xs font-semibold ${
              currentTab === 'register'
                ? 'text-white dark:text-black'
                : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Create account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AuthTrustFooter() {
  return (
    <View className="border-border dark:border-border-dark border-t pt-4">
      <View className="flex-row items-center justify-center gap-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="shield-checkmark" size={13} color="#10b981" />
          <Text className="text-muted dark:text-muted-dark text-[11px] font-medium">
            256-bit SSL Security
          </Text>
        </View>
        <Text className="text-border dark:text-border-dark">•</Text>
        <View className="flex-row items-center gap-1">
          <Ionicons name="card-outline" size={13} color="#6366f1" />
          <Text className="text-muted dark:text-muted-dark text-[11px] font-medium">
            Direct MoMo Rails
          </Text>
        </View>
      </View>
    </View>
  );
}
