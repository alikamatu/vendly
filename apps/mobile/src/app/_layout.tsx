import '../../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';

import { useThemeColors } from '@/components/ui';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { CartProvider } from '@/providers/cart-provider';
import { ThemeProvider } from '@/providers/theme-provider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { isRestoring } = useAuth();
  const colors = useThemeColors();

  useEffect(() => {
    if (!isRestoring) SplashScreen.hideAsync().catch(() => {});
  }, [isRestoring]);

  if (isRestoring) return null;

  return (
    <>
      <StatusBar style={colors.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: colors.foreground,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="categories" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: '' }} />
        <Stack.Screen name="store/[slug]" options={{ title: 'Storefront' }} />
        <Stack.Screen name="checkout/[storeLink]" options={{ title: 'Checkout' }} />
        <Stack.Screen name="orders/index" options={{ title: 'My Orders' }} />
        <Stack.Screen name="orders/[id]" options={{ title: 'Order Details' }} />
        <Stack.Screen name="favorites" options={{ title: 'Saved Items' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="account/profile" options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="account/addresses" options={{ title: 'Saved Addresses' }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="register" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen
          name="forgot-password"
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <RootNavigator />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
