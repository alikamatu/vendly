import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

interface PasswordStrengthProps {
  value?: string;
}

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'An uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter (a-z)', test: (v) => /[a-z]/.test(v) },
  { label: 'A number or symbol (0-9, !@#$)', test: (v) => /[\d\W]/.test(v) },
];

const LEVELS = [
  { label: 'Too weak', bg: 'bg-red-500', text: 'text-red-500' },
  { label: 'Weak', bg: 'bg-orange-500', text: 'text-orange-500' },
  { label: 'Fair', bg: 'bg-amber-500', text: 'text-amber-500' },
  { label: 'Strong', bg: 'bg-emerald-500', text: 'text-emerald-500' },
  { label: 'Excellent', bg: 'bg-emerald-600', text: 'text-emerald-600' },
];

export function PasswordStrength({ value = '' }: PasswordStrengthProps) {
  const { score, results } = useMemo(() => {
    const r = RULES.map((rule) => ({ ...rule, passed: rule.test(value) }));
    let s = r.filter((x) => x.passed).length;
    if (value.length >= 14) s = Math.min(s + 1, LEVELS.length - 1);
    return { score: s, results: r };
  }, [value]);

  if (!value) return null;

  const level = LEVELS[Math.max(0, Math.min(score, LEVELS.length - 1))];

  return (
    <View className="gap-2 pt-1">
      <View className="flex-row items-center gap-2.5">
        {/* 4 discrete segments */}
        <View className="h-1.5 flex-1 flex-row gap-1.5">
          {[1, 2, 3, 4].map((step) => {
            const isFilled = score >= step;
            return (
              <View
                key={step}
                className={`h-full flex-1 rounded-full ${
                  isFilled ? level.bg : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
              />
            );
          })}
        </View>
        <Text className={`text-[11px] font-semibold ${level.text}`}>{level.label}</Text>
      </View>

      <View className="flex-row flex-wrap gap-x-3 gap-y-1">
        {results.map((rule) => (
          <View key={rule.label} className="w-[48%] flex-row items-center gap-1.5">
            {rule.passed ? (
              <Ionicons name="checkmark-circle" size={13} color="#10b981" />
            ) : (
              <View className="ml-0.5 mr-1 h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            )}
            <Text
              numberOfLines={1}
              className={`text-[11px] ${
                rule.passed
                  ? 'font-medium text-emerald-600 dark:text-emerald-400'
                  : 'text-muted dark:text-muted-dark'
              }`}
            >
              {rule.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
