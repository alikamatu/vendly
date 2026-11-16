import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHeader, AuthTrustFooter } from '@/components/auth-header';
import { Button, TextField } from '@/components/ui';
import { authApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP' | 'SMS'>('TOTP');
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isResendingSms, setIsResendingSms] = useState(false);
  const [isResendingVerify, setIsResendingVerify] = useState(false);

  const isUnverified = !!error && /verify your email/i.test(error);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const opts = twoFactorRequired
        ? useBackupCode
          ? { totp_backup_code: twoFactorCode.trim() }
          : { totp_code: twoFactorCode.trim() }
        : undefined;

      const res = await login(email, password, opts);

      if (res.status === '2fa') {
        setTwoFactorRequired(true);
        setTwoFactorMethod(res.method);
        setPhoneHint(res.phoneHint ?? null);
        setError(null);
        return;
      }

      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSms = async () => {
    setIsResendingSms(true);
    try {
      const res = await authApi.resendSmsCode(email.trim().toLowerCase(), password);
      Alert.alert(
        'Code sent',
        `A new verification code was sent to ${res.phone_hint || 'your phone'}.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend SMS code.');
    } finally {
      setIsResendingSms(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address above first.');
      return;
    }
    setIsResendingVerify(true);
    try {
      const res = await authApi.resendVerification(email.trim().toLowerCase());
      Alert.alert(
        'Verification link sent',
        res.message || 'Check your inbox to verify your email.',
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send verification email.');
    } finally {
      setIsResendingVerify(false);
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
            <AuthHeader
              currentTab="login"
              title={twoFactorRequired ? 'Two-Factor Challenge' : 'Welcome back'}
              subtitle={
                twoFactorRequired
                  ? twoFactorMethod === 'SMS'
                    ? `Enter the 6-digit SMS code sent to ${phoneHint || 'your phone'}.`
                    : 'Enter the 6-digit code from your authenticator app.'
                  : 'Sign in to access your orders, storefront, and payouts.'
              }
            />

            {error ? (
              <View className="gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
                <View className="flex-row items-start gap-2.5">
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color="#ef4444"
                    style={{ marginTop: 1 }}
                  />
                  <Text className="flex-1 text-xs font-medium leading-5 text-red-700 dark:text-red-300">
                    {error}
                  </Text>
                </View>
                {isUnverified ? (
                  <Pressable
                    onPress={handleResendVerification}
                    disabled={isResendingVerify}
                    className="self-start rounded-full bg-red-600 px-3 py-1.5"
                  >
                    <Text className="text-[11px] font-semibold text-white">
                      {isResendingVerify ? 'Sending...' : 'Resend verification email'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {!twoFactorRequired ? (
              <View className="gap-4">
                <TextField
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="mail-outline"
                />

                <View className="gap-1.5">
                  <TextField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    isPassword
                    leftIcon="lock-closed-outline"
                  />

                  <Pressable
                    onPress={() => router.push('/forgot-password')}
                    className="self-end py-1"
                  >
                    <Text className="text-xs font-semibold text-neutral-900 underline dark:text-neutral-100">
                      Forgot password?
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="gap-4">
                <TextField
                  label={useBackupCode ? '8-Digit Backup Code' : '6-Digit Verification Code'}
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                  placeholder={useBackupCode ? 'Enter backup code' : '123456'}
                  keyboardType={useBackupCode ? 'default' : 'number-pad'}
                  autoCapitalize="none"
                  autoFocus
                  leftIcon="key-outline"
                />

                <View className="flex-row items-center justify-between">
                  <Pressable onPress={() => setUseBackupCode((prev) => !prev)}>
                    <Text className="text-xs font-medium text-neutral-900 underline dark:text-neutral-100">
                      {useBackupCode ? 'Use authenticator code' : 'Use a backup code'}
                    </Text>
                  </Pressable>

                  {twoFactorMethod === 'SMS' && !useBackupCode ? (
                    <Pressable onPress={handleResendSms} disabled={isResendingSms}>
                      <Text className="text-accent text-xs font-semibold underline">
                        {isResendingSms ? 'Resending...' : 'Resend SMS code'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}

            <Button
              title={twoFactorRequired ? 'Verify & Continue' : 'Sign In'}
              onPress={handleSubmit}
              loading={isLoading}
              icon={twoFactorRequired ? 'shield-checkmark-outline' : 'log-in-outline'}
            />

            {twoFactorRequired ? (
              <Pressable
                onPress={() => {
                  setTwoFactorRequired(false);
                  setTwoFactorCode('');
                }}
                className="self-center py-2"
              >
                <Text className="text-muted dark:text-muted-dark text-xs underline">
                  Back to credentials
                </Text>
              </Pressable>
            ) : null}
          </View>

          <AuthTrustFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
