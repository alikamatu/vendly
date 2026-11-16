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
import { PasswordStrength } from '@/components/password-strength';
import { Button, TextField } from '@/components/ui';
import { authApi } from '@/lib/api';
import { normalizeGhanaPhone, PASSWORD_RULE } from '@/lib/format';

export default function RegisterScreen() {
  const [step, setStep] = useState<'details' | 'password'>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    const cleanPhone = normalizeGhanaPhone(phone);
    if (!cleanPhone) {
      setError('Please enter a valid Ghana phone number (e.g. 024 412 3456).');
      return;
    }
    setError(null);
    setStep('password');
  };

  const handleSubmit = async () => {
    const cleanPhone = normalizeGhanaPhone(phone);
    if (!cleanPhone) {
      setStep('details');
      setError('Please enter a valid Ghana phone number (e.g. 024 412 3456).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!PASSWORD_RULE.test(password)) {
      setError(
        'Password must include an uppercase letter, a lowercase letter, and a number or symbol.',
      );
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        password,
        accept_terms: true,
      });

      Alert.alert(
        'Account Created',
        res.message || 'Please check your email to verify your account, then sign in.',
        [{ text: 'Sign in', onPress: () => router.replace('/login') }],
      );
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
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
            <AuthHeader
              currentTab="register"
              title={step === 'details' ? 'Create an account' : 'Set your password'}
              subtitle={
                step === 'details'
                  ? 'Join Verndly to buy from trusted student & campus vendors across Ghana.'
                  : 'Choose a strong password to secure your account.'
              }
            />

            {error ? (
              <View className="flex-row items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
                <Ionicons name="alert-circle" size={18} color="#ef4444" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs font-medium leading-5 text-red-700 dark:text-red-300">
                  {error}
                </Text>
              </View>
            ) : null}

            {step === 'details' ? (
              <>
                <View className="gap-4">
                  <TextField
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Kofi Mensah"
                    autoCapitalize="words"
                    leftIcon="person-outline"
                  />

                  <TextField
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="kofi@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    leftIcon="mail-outline"
                  />

                  <TextField
                    label="Ghana Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="024 123 4567"
                    keyboardType="phone-pad"
                    leftIcon="call-outline"
                    prefix="GH +233"
                    hint="Used for order confirmation & delivery updates"
                  />
                </View>

                <Button title="Next" onPress={handleNextStep} icon="arrow-forward-outline" />
              </>
            ) : (
              <>
                <View className="gap-4">
                  <View className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex-row items-center justify-between rounded-xl border px-3.5 py-2.5">
                    <Pressable
                      onPress={() => {
                        setError(null);
                        setStep('details');
                      }}
                      className="flex-row items-center gap-1.5"
                    >
                      <Ionicons name="arrow-back" size={14} color="#888888" />
                      <Text className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        Back
                      </Text>
                    </Pressable>
                    <Text
                      numberOfLines={1}
                      className="text-muted dark:text-muted-dark ml-3 flex-1 text-right text-xs"
                    >
                      {email}
                    </Text>
                  </View>

                  <View className="gap-2">
                    <TextField
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      isPassword
                      autoFocus
                      leftIcon="lock-closed-outline"
                    />
                    <PasswordStrength value={password} />
                  </View>

                  <TextField
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    isPassword
                    leftIcon="shield-checkmark-outline"
                  />

                  <Pressable
                    onPress={() => setAcceptTerms(!acceptTerms)}
                    className="border-border/80 bg-surface/50 dark:border-border-dark dark:bg-surface-dark/50 mt-1 flex-row items-center gap-3 rounded-xl border p-3"
                  >
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-md border ${
                        acceptTerms
                          ? 'border-emerald-600 bg-emerald-600'
                          : 'border-neutral-400 dark:border-neutral-600'
                      }`}
                    >
                      {acceptTerms ? <Ionicons name="checkmark" size={14} color="#ffffff" /> : null}
                    </View>
                    <Text className="flex-1 text-xs leading-5 text-neutral-700 dark:text-neutral-300">
                      I agree to Verndly&apos;s{' '}
                      <Text className="font-semibold text-neutral-900 underline dark:text-neutral-100">
                        Terms of Service
                      </Text>{' '}
                      and{' '}
                      <Text className="font-semibold text-neutral-900 underline dark:text-neutral-100">
                        Privacy Policy
                      </Text>
                    </Text>
                  </Pressable>
                </View>

                <Button
                  title="Create Account"
                  onPress={handleSubmit}
                  loading={isLoading}
                  icon="person-add-outline"
                />
              </>
            )}
          </View>

          <AuthTrustFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
