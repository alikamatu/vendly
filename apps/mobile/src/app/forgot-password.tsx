import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTrustFooter } from '@/components/auth-header';
import { Button, TextField } from '@/components/ui';
import { authApi } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="p-6 gap-6 flex-grow justify-between"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-6">
            {/* Header Icon & Title */}
            <View className="gap-3">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <Ionicons
                  name={submitted ? 'checkmark-circle' : 'key-outline'}
                  size={28}
                  color={submitted ? '#10b981' : '#ef4444'}
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {submitted ? 'Check your email' : 'Reset password'}
                </Text>
                <Text className="text-muted dark:text-muted-dark text-xs leading-5">
                  {submitted
                    ? `If an account exists for ${email}, a secure password recovery link has been sent. Check your inbox and spam folder.`
                    : "Enter your registered email address and we'll send you instructions to safely recover your account credentials."}
                </Text>
              </View>
            </View>

            {error ? (
              <View className="flex-row items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
                <Ionicons name="alert-circle" size={18} color="#ef4444" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs font-medium leading-5 text-red-700 dark:text-red-300">
                  {error}
                </Text>
              </View>
            ) : null}

            {!submitted ? (
              <View className="gap-4">
                <TextField
                  label="Registered Email Address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="mail-outline"
                />

                <Button
                  title="Send recovery link"
                  onPress={handleSubmit}
                  loading={isLoading}
                  icon="paper-plane-outline"
                />
              </View>
            ) : (
              <View className="gap-3">
                <Button
                  title="Return to sign in"
                  onPress={() => router.replace('/login')}
                  icon="log-in-outline"
                />
                <Button
                  title="Try another email"
                  variant="outline"
                  onPress={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                />
              </View>
            )}

            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center justify-center gap-1.5 self-center py-2"
            >
              <Ionicons name="arrow-back" size={15} color="#888888" />
              <Text className="text-muted dark:text-muted-dark text-xs font-medium underline">
                Back to previous screen
              </Text>
            </Pressable>
          </View>

          <AuthTrustFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
