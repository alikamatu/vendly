import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { RequireAuth } from '@/components/require-auth';
import { ListSkeleton } from '@/components/skeleton';
import { EmptyState, ErrorState, useThemeColors } from '@/components/ui';
import { notificationApi, type NotificationItem } from '@/lib/api';
import { formatDate } from '@/lib/format';

function NotificationsList() {
  const colors = useThemeColors();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => notificationApi.list({ take: 40 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications-list'] });
      void qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications-list'] });
      void qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  if (listQuery.isPending) return <ListSkeleton rows={5} />;
  if (listQuery.isError) {
    return <ErrorState message={listQuery.error.message} onRetry={() => listQuery.refetch()} />;
  }

  const items: NotificationItem[] = listQuery.data?.items ?? [];
  const hasUnread = items.some((n) => !n.is_read);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="notifications-off-outline"
        title="You're all caught up"
        message="Order updates and marketplace notifications will show up here."
      />
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      {hasUnread ? (
        <View className="border-border dark:border-border-dark flex-row items-center justify-end border-b px-4 py-2.5">
          <Pressable
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex-row items-center gap-1.5 rounded-full bg-black px-3 py-1.5 dark:bg-white"
          >
            <Ionicons name="checkmark-done" size={14} color={colors.dark ? '#000' : '#fff'} />
            <Text className="text-xs font-bold text-white dark:text-black">Mark all read</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2.5 p-4 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isRefetching}
            onRefresh={() => {
              void listQuery.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              if (!item.is_read) markReadMutation.mutate(item.id);
            }}
            className={`border-border dark:border-border-dark flex-row items-start gap-3 rounded-2xl border p-4 ${
              item.is_read ? 'bg-white dark:bg-neutral-950' : 'bg-surface dark:bg-surface-dark'
            }`}
          >
            <View
              className={`mt-0.5 h-9 w-9 items-center justify-center rounded-xl ${
                item.is_read ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-accent/15'
              }`}
            >
              <Ionicons
                name="notifications"
                size={17}
                color={item.is_read ? colors.muted : colors.accent}
              />
            </View>
            <View className="flex-1 gap-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {item.title}
                </Text>
                {!item.is_read ? <View className="bg-accent h-2 w-2 rounded-full" /> : null}
              </View>
              <Text className="text-xs leading-5 text-neutral-700 dark:text-neutral-300">
                {item.body}
              </Text>
              <Text className="text-muted dark:text-muted-dark text-[11px]">
                {formatDate(item.created_at)}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

export default function NotificationsScreen() {
  return (
    <RequireAuth
      title="Your notifications"
      message="Sign in to view order updates and account alerts."
    >
      <NotificationsList />
    </RequireAuth>
  );
}
