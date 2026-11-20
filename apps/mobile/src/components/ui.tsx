import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
} from 'react-native';

import { useThemeMode } from '@/providers/theme-provider';

/**
 * Theme-aware colours matching `apps/web/app/globals.css` design tokens:
 * - Light: background `#ffffff`, foreground `#171717`, primary `#000000`,
 *          accent `#ef4444`, surface `#f7f8fa`, border `#e2e4e9`, muted `#6b7280`
 * - Dark:  background `#0a0a0a`, foreground `#f5f5f5`, primary `#ffffff`,
 *          accent `#ef4444`, surface `#141414`, border `#262626`, muted `#a3a3a3`
 */
export function useThemeColors() {
  const { isDark: dark } = useThemeMode();
  return {
    dark,
    foreground: dark ? '#f5f5f5' : '#171717',
    muted: dark ? '#a3a3a3' : '#6b7280',
    background: dark ? '#0a0a0a' : '#ffffff',
    surface: dark ? '#141414' : '#f7f8fa',
    border: dark ? '#262626' : '#e2e4e9',
    accent: '#ef4444',
  };
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

const buttonStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: { container: 'bg-black dark:bg-white', text: 'text-white dark:text-black' },
  secondary: { container: 'bg-accent', text: 'text-white' },
  outline: {
    container: 'border border-border dark:border-border-dark bg-transparent',
    text: 'text-neutral-900 dark:text-neutral-100',
  },
  danger: { container: 'bg-red-50 dark:bg-red-950', text: 'text-red-600 dark:text-red-400' },
};

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  className?: string;
}

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  icon,
  className = '',
  ...rest
}: ButtonProps) {
  const s = buttonStyles[variant];
  const isDisabled = disabled || loading;
  const colors = useThemeColors();
  const iconColor =
    variant === 'primary'
      ? colors.dark
        ? '#000'
        : '#fff'
      : variant === 'secondary'
        ? '#fff'
        : variant === 'danger'
          ? '#ef4444'
          : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-xl px-5 active:opacity-80 ${s.container} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={iconColor} /> : null}
          <Text className={`text-base font-semibold ${s.text}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
  isPassword?: boolean;
  prefix?: string;
}

export function TextField({
  label,
  hint,
  leftIcon,
  isPassword = false,
  prefix,
  className = '',
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const colors = useThemeColors();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const effectiveSecure = isPassword ? !showPassword : secureTextEntry;
  const effectiveRightIcon = isPassword
    ? showPassword
      ? 'eye-off-outline'
      : 'eye-outline'
    : undefined;

  const handleRightPress = isPassword ? () => setShowPassword((prev) => !prev) : undefined;

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
          {label}
        </Text>
      ) : null}
      <View
        className={`h-12 flex-row items-center rounded-xl border bg-white px-3.5 transition-colors dark:bg-neutral-900 ${
          isFocused
            ? 'border-neutral-900 dark:border-neutral-100'
            : 'border-border dark:border-border-dark'
        } ${className}`}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={isFocused ? (colors.dark ? '#fff' : '#000') : colors.muted}
            style={{ marginRight: 8 }}
          />
        ) : null}
        {prefix ? (
          <View className="border-border dark:border-border-dark mr-2 flex-row items-center gap-1 border-r pr-2">
            <Text className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {prefix}
            </Text>
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.muted}
          className="h-full flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100"
          secureTextEntry={effectiveSecure}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {effectiveRightIcon ? (
          <Pressable
            hitSlop={8}
            onPress={handleRightPress}
            disabled={!handleRightPress}
            className="ml-2 items-center justify-center"
          >
            <Ionicons name={effectiveRightIcon} size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text className="text-muted dark:text-muted-dark text-[11px]">{hint}</Text> : null}
    </View>
  );
}

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  action?: { title: string; onPress: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white p-8 dark:bg-neutral-950">
      <View className="bg-surface dark:bg-surface-dark border-border dark:border-border-dark mb-2 h-16 w-16 items-center justify-center rounded-full border">
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </Text>
      {message ? (
        <Text className="text-muted dark:text-muted-dark max-w-xs text-center text-sm">
          {message}
        </Text>
      ) : null}
      {action ? <Button title={action.title} onPress={action.onPress} className="mt-3" /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Something went wrong"
      message={message}
      action={onRetry ? { title: 'Try again', onPress: onRetry } : undefined}
    />
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}) {
  const tones = {
    neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
    accent: 'bg-accent text-white',
    success: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  };
  return (
    <Text
      className={`self-start overflow-hidden rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {label}
    </Text>
  );
}

export function Divider() {
  return <View className="bg-border dark:bg-border-dark h-px" />;
}

export function SectionHeader({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  eyebrowIcon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="mb-3.5 flex-row items-end justify-between gap-3">
      <View className="flex-1">
        {eyebrow ? (
          <View className="mb-1 flex-row items-center gap-1.5">
            {eyebrowIcon ? (
              <Ionicons name={eyebrowIcon} size={13} color={colors.accent} />
            ) : (
              <View className="bg-accent h-1.5 w-1.5 rounded-full" />
            )}
            <Text className="text-accent text-[11px] font-medium uppercase tracking-widest">
              {eyebrow}
            </Text>
          </View>
        ) : null}
        <Text className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-muted dark:text-muted-dark mt-0.5 text-xs">{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex-row items-center gap-1 rounded-full border px-3 py-1.5 active:opacity-80"
        >
          <Text className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {actionLabel}
          </Text>
          <Ionicons name="arrow-forward" size={12} color={colors.foreground} />
        </Pressable>
      ) : null}
    </View>
  );
}
