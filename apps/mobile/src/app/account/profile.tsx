import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { Button, TextField } from '@/components/ui';
import { authApi } from '@/lib/api';
import { sanitizePhoneInput } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(sanitizePhoneInput(user?.phone_e164 ?? ''));
  const [school, setSchool] = useState(user?.school ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!fullName.trim()) {
      Alert.alert('Full name required', 'Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      await authApi.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        school: school.trim() || undefined,
      });
      await refreshUser();
      Alert.alert('Saved', 'Your profile details have been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      <ScrollView contentContainerClassName="gap-4 p-4">
        <TextField
          label="Email address"
          value={user?.email ?? ''}
          editable={false}
          hint="Email address is linked to your account sign-in."
        />
        <TextField
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          autoCapitalize="words"
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
          label="Location / Campus (optional)"
          value={school}
          onChangeText={setSchool}
          placeholder="Accra, Ghana"
        />

        <View className="pt-2">
          <Button
            title="Save changes"
            loading={saving}
            onPress={handleSave}
            icon="checkmark-circle-outline"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function EditProfileScreen() {
  return (
    <RequireAuth title="Edit profile" message="Sign in to manage your personal details.">
      <ProfileForm />
    </RequireAuth>
  );
}
