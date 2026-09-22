'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Send, CheckCircle2, Users, Shield, MessageSquare, Clock } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { dateTime } from '@/lib/format';
import { VendlyNotificationService } from '@/services/notification.service';
import type { AdminNotification, BroadcastInput } from '@/types/operations';
import { useToast } from '@/contexts/ToastContext';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState<BroadcastInput>({
    title: '',
    body: '',
    role: undefined,
  });

  const { success, error: toastError } = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await VendlyNotificationService.list({ limit: 50 });
      setNotifications(res.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.body) {
      toastError('Title and message are required');
      return;
    }

    setBroadcastLoading(true);
    try {
      const res = await VendlyNotificationService.broadcast(broadcastForm);
      success(`Broadcast delivered to ${res.count || 'all targeted'} users`);
      setBroadcastOpen(false);
      setBroadcastForm({ title: '', body: '', role: undefined });
      await fetchNotifications();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Broadcast failed');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await VendlyNotificationService.markAllRead();
      success('All notifications marked as read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Notifications & Broadcasts
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Review operational alerts and send platform announcements across the marketplace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-xs">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Mark All Read
            </Button>
            <Button
              size="sm"
              onClick={() => setBroadcastOpen(true)}
              className="bg-brand hover:bg-brand-hover text-xs"
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              Compose Broadcast
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <TableEmpty
            icon={Bell}
            title="No notifications"
            description="You have no alerts or broadcast records in history."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Message Body</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Read Status</TableHead>
                <TableHead className="text-right">Sent</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <Badge variant="outline">{n.type}</Badge>
                  </TableCell>
                  <TableCell className="text-foreground text-xs font-semibold">{n.title}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate text-xs">
                    {n.body}
                  </TableCell>
                  <TableCell className="text-foreground text-xs">
                    {n.user?.full_name || n.user?.email || 'System Broadcast'}
                  </TableCell>
                  <TableCell>
                    {n.is_read ? (
                      <span className="text-muted-foreground text-[11px]">Read</span>
                    ) : (
                      <Badge variant="brand" dot>
                        Unread
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {dateTime(n.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Broadcast Composer Modal */}
        <Modal
          isOpen={broadcastOpen}
          onClose={() => setBroadcastOpen(false)}
          title="Compose Platform Announcement"
          description="Send real-time in-app alerts and notifications to users."
          maxWidth="md"
        >
          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-foreground font-medium">Target Audience</label>
              <select
                value={broadcastForm.role || ''}
                onChange={(e) =>
                  setBroadcastForm((prev) => ({
                    ...prev,
                    role: (e.target.value as any) || undefined,
                  }))
                }
                className="border-border bg-card text-foreground focus:ring-brand h-9 w-full rounded-lg border px-3 text-xs focus:outline-none focus:ring-1"
              >
                <option value="">All Platform Members</option>
                <option value="SELLER">Verified Merchants Only</option>
                <option value="USER">Buyers Only</option>
                <option value="ADMIN">Administrative Staff Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-foreground font-medium">Announcement Title</label>
              <Input
                placeholder="e.g. Scheduled System Maintenance / Black Friday Seller Boost"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm((prev) => ({ ...prev, title: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-foreground font-medium">Message Content</label>
              <textarea
                rows={4}
                placeholder="Enter detailed broadcast announcement..."
                value={broadcastForm.body}
                onChange={(e) => setBroadcastForm((prev) => ({ ...prev, body: e.target.value }))}
                className="border-border bg-card text-foreground focus:ring-brand w-full rounded-lg border p-3 text-xs leading-relaxed focus:outline-none focus:ring-1"
              />
            </div>

            <div className="border-border flex justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBroadcastOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={broadcastLoading}
                className="bg-brand hover:bg-brand-hover text-white"
              >
                {broadcastLoading ? 'Sending...' : 'Send Broadcast'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminShell>
  );
}
