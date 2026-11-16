import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

/**
 * Wrap screens that need a signed-in user. Shows a friendly sign-in prompt
 * instead of redirecting, so guests can still browse the tab.
 */
export function RequireAuth({
  children,
  title = 'Sign in to continue',
  message = 'Create an account or sign in to view this page.',
}: {
  children: React.ReactNode;
  title?: string;
  message?: string;
}) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <>{children}</>;
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
      <ScrollView contentContainerClassName="flex-grow items-center justify-center gap-3 p-8">
        <View className="bg-surface dark:bg-surface-dark mb-2 h-16 w-16 items-center justify-center rounded-full">
          <Ionicons name="person-outline" size={28} color="#6b7280" />
        </View>
        <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </Text>
        <Text className="text-muted dark:text-muted-dark text-center">{message}</Text>
        <View className="mt-4 w-full gap-3">
          <Button title="Sign in" onPress={() => router.push('/login')} />
          <Button
            title="Create account"
            variant="outline"
            onPress={() => router.push('/register')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
