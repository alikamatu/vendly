'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  History,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  ADMIN_SMS_TEMPLATES,
  computeSmsMetrics,
  interpolateSmsPreview,
  parseManualGhanaPhones,
  type SmsTemplateCategory,
  type SmsTemplateItem,
} from '@/lib/ghana-phone';
import {
  VendlySmsService,
  type AdminSmsHistoryItem,
  type AdminSmsRecipient,
  type AdminSmsStatus,
  type SendAdminSmsResponse,
  type SmsRecipientSegment,
} from '@/services/sms.service';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { AdminEmailSection } from '@/components/sms/AdminEmailSection';

const SEGMENTS: Array<{ id: SmsRecipientSegment; label: string }> = [
  { id: 'all', label: 'All Users' },
  { id: 'sellers', label: 'All Sellers' },
  { id: 'sellers_unverified', label: 'Unverified Sellers' },
  { id: 'sellers_incomplete_onboarding', label: 'Needs Onboarding' },
  { id: 'sellers_no_payout', label: 'No Payout Setup' },
  { id: 'sellers_verified', label: 'Verified Sellers' },
  { id: 'pro_sellers', label: 'Pro Sellers' },
  { id: 'buyers', label: 'Buyers' },
];

const TEMPLATE_CATEGORIES: Array<'All' | SmsTemplateCategory> = [
  'All',
  'Verification',
  'Onboarding',
  'Operations',
  'Growth',
];

const PERSONALIZATION_TOKENS = [
  { token: '{first_name}', label: 'First Name' },
  { token: '{name}', label: 'Full Name' },
  { token: '{store_name}', label: 'Store Name' },
];

export default function AdminSmsPage() {
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [status, setStatus] = useState<AdminSmsStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Recipients directory state
  const [recipients, setRecipients] = useState<AdminSmsRecipient[]>([]);
  const [recipientsTotal, setRecipientsTotal] = useState(0);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [recipientsTotalPages, setRecipientsTotalPages] = useState(1);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [segment, setSegment] = useState<SmsRecipientSegment>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [onlyWithPhone, setOnlyWithPhone] = useState(true);

  // Selected users (map persists across pagination & segment switching!)
  const [selectedUsers, setSelectedUsers] = useState<Map<string, AdminSmsRecipient>>(
    () => new Map(),
  );

  // Manual phone numbers input (comma, newline, or semicolon separated)
  const [manualInput, setManualInput] = useState('');

  // Composer & templates state
  const [templateFilter, setTemplateFilter] = useState<'All' | SmsTemplateCategory>('All');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [senderId, setSenderId] = useState('');
  const [sending, setSending] = useState(false);

  // Post-send receipt modal
  const [lastReceipt, setLastReceipt] = useState<SendAdminSmsResponse | null>(null);

  // Delivery history state
  const [history, setHistory] = useState<AdminSmsHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [inspectLog, setInspectLog] = useState<AdminSmsHistoryItem | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setRecipientsPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await VendlySmsService.getStatus();
      setStatus(res);
      setSenderId((prev) => prev || res.senderId || 'Verndly');
    } catch {
      // keep previous status
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchRecipients = useCallback(async () => {
    setRecipientsLoading(true);
    try {
      const res = await VendlySmsService.listRecipients({
        search: debouncedSearch || undefined,
        segment,
        onlyWithPhone,
        page: recipientsPage,
        limit: 50,
      });
      setRecipients(res.data || []);
      setRecipientsTotal(res.total || 0);
      setRecipientsTotalPages(res.totalPages || 1);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load recipients');
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  }, [debouncedSearch, segment, onlyWithPhone, recipientsPage, toastError]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await VendlySmsService.getHistory(historyPage, 25);
      setHistory(res.data || []);
      setHistoryTotalPages(res.totalPages || 1);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load SMS history');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, toastError]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    void fetchRecipients();
  }, [fetchRecipients]);

  useEffect(() => {
    if (activeTab === 'history') {
      void fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Parse manual phone numbers live
  const parsedManual = useMemo(() => parseManualGhanaPhones(manualInput), [manualInput]);
  const validManualPhones = useMemo(
    () => parsedManual.filter((p) => p.valid && p.normalized),
    [parsedManual],
  );
  const invalidManualPhones = useMemo(() => parsedManual.filter((p) => !p.valid), [parsedManual]);

  // Combine selected users + manual entries, deduplicated by normalized 233XXXXXXXXX
  const uniqueTargetNumbers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; storeName?: string | null }>();
    for (const user of selectedUsers.values()) {
      if (user.formatted_phone && !map.has(user.formatted_phone)) {
        map.set(user.formatted_phone, {
          name: user.full_name,
          phone: user.formatted_phone,
          storeName: user.store_name,
        });
      }
    }
    for (const m of validManualPhones) {
      if (m.normalized && !map.has(m.normalized)) {
        map.set(m.normalized, { name: 'Direct Recipient', phone: m.normalized });
      }
    }
    return Array.from(map.values());
  }, [selectedUsers, validManualPhones]);

  const smsMetrics = useMemo(() => computeSmsMetrics(message), [message]);
  const estimatedCredits = smsMetrics.segments * uniqueTargetNumbers.length;

  const sampleRecipient = uniqueTargetNumbers[0] || {
    name: 'Kwame Mensah',
    phone: '233244123456',
    storeName: 'Kwame Tech Hub',
  };

  const renderedPreview = useMemo(() => {
    if (!message.trim()) return '';
    return interpolateSmsPreview(message, {
      name: sampleRecipient.name,
      storeName: sampleRecipient.storeName,
    });
  }, [message, sampleRecipient.name, sampleRecipient.storeName]);

  const filteredTemplates = useMemo(() => {
    if (templateFilter === 'All') return ADMIN_SMS_TEMPLATES;
    return ADMIN_SMS_TEMPLATES.filter((t) => t.category === templateFilter);
  }, [templateFilter]);

  const toggleUserSelection = (user: AdminSmsRecipient) => {
    if (!user.phone_valid && !user.email) {
      toastError(`${user.full_name} has no phone number or email.`);
      return;
    }
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, user);
      return next;
    });
  };

  const validVisibleUsers = useMemo(
    () => recipients.filter((u) => u.phone_valid || Boolean(u.email)),
    [recipients],
  );

  const allVisibleSelected =
    validVisibleUsers.length > 0 && validVisibleUsers.every((u) => selectedUsers.has(u.id));

  const handleToggleAllVisible = () => {
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (allVisibleSelected) {
        for (const u of validVisibleUsers) next.delete(u.id);
      } else {
        for (const u of validVisibleUsers) next.set(u.id, u);
      }
      return next;
    });
  };

  const handleLoadTemplate = (tpl: SmsTemplateItem) => {
    setActiveTemplateId(tpl.id);
    setMessage(tpl.body);
  };

  const handleInsertToken = (token: string) => {
    setMessage((prev) => {
      if (!prev) return token;
      const needsSpace = !prev.endsWith(' ') && !prev.endsWith('\n');
      return `${prev}${needsSpace ? ' ' : ''}${token}`;
    });
  };

  const handleSend = async () => {
    const cleanMsg = message.trim();
    if (cleanMsg.length < 2) {
      toastError('Enter an SMS message before sending.');
      return;
    }
    if (uniqueTargetNumbers.length === 0) {
      toastError('Select at least one user or enter a valid Ghana phone number.');
      return;
    }
    if (invalidManualPhones.length > 0) {
      toastError(
        `Fix or remove ${invalidManualPhones.length} invalid manual phone number(s) before sending.`,
      );
      return;
    }

    const previewNumbers = uniqueTargetNumbers
      .slice(0, 5)
      .map((t) => `${t.name} (${t.phone})`)
      .join(', ');
    const moreLabel =
      uniqueTargetNumbers.length > 5 ? ` +${uniqueTargetNumbers.length - 5} more` : '';

    const ok = await confirm({
      title: `Send SMS to ${uniqueTargetNumbers.length} recipient${uniqueTargetNumbers.length === 1 ? '' : 's'}?`,
      description: status?.sandbox
        ? 'Arkesel is currently in SANDBOX mode — no live SMS charges will occur.'
        : `This will dispatch live SMS via Arkesel (${estimatedCredits} estimated SMS credit${estimatedCredits === 1 ? '' : 's'}).`,
      details: (
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-muted-foreground font-medium">Recipients (233 format): </span>
            <span className="text-foreground font-mono">
              {previewNumbers}
              {moreLabel}
            </span>
          </div>
          <div className="border-border bg-muted/40 rounded-lg border p-2.5">
            <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase">
              Preview ({senderId || status?.senderId || 'Verndly'})
            </p>
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">{renderedPreview}</p>
          </div>
        </div>
      ),
      confirmText: status?.sandbox ? 'Send Test SMS' : `Send ${uniqueTargetNumbers.length} SMS`,
      cancelText: 'Cancel',
      variant: 'info',
      icon: 'check',
    });

    if (!ok) return;

    setSending(true);
    try {
      const res = await VendlySmsService.send({
        message: cleanMsg,
        userIds: Array.from(selectedUsers.keys()),
        customNumbers: validManualPhones
          .map((p) => p.normalized)
          .filter((n): n is string => Boolean(n)),
        templateId: activeTemplateId || undefined,
        senderId: senderId.trim() || undefined,
      });

      setLastReceipt(res);
      if (res.sentCount > 0 && res.failedCount === 0) {
        success(
          `Delivered ${res.sentCount} SMS message${res.sentCount === 1 ? '' : 's'}${res.sandbox ? ' (Sandbox)' : ''}.`,
        );
      } else if (res.sentCount > 0) {
        toastError(
          `Partial delivery: ${res.sentCount} sent, ${res.failedCount} failed, ${res.invalidCount} invalid.`,
        );
      } else {
        toastError(
          res.results[0]?.error || 'SMS delivery failed. Check your Arkesel API key & sender ID.',
        );
      }

      void fetchStatus();
      if (activeTab === 'history') void fetchHistory();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              SMS &amp; Email
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Send SMS in{' '}
              <span className="text-foreground font-mono font-semibold">233XXXXXXXXX</span> format,
              or reminder emails in the same Verndly layout as approval messages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="border-border bg-card inline-flex rounded-xl border p-1">
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  activeTab === 'compose'
                    ? 'bg-brand text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Send className="h-3.5 w-3.5" />
                Compose &amp; Send
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  activeTab === 'history'
                    ? 'bg-brand text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <History className="h-3.5 w-3.5" />
                Delivery History
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void fetchStatus();
                if (activeTab === 'compose') void fetchRecipients();
                else void fetchHistory();
              }}
              className="h-9 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Gateway Warning Banner if ARKESEL_API_KEY not configured */}
        {!statusLoading && status && !status.configured && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Arkesel API key is not configured on the API server</p>
              <p className="mt-0.5 opacity-90">
                Set <code className="font-mono font-semibold">ARKESEL_API_KEY</code> (and optionally{' '}
                <code className="font-mono font-semibold">ARKESEL_SENDER_ID=Verndly</code>) in your
                backend environment to dispatch live SMS messages.
              </p>
            </div>
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-border bg-card rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                SMS Gateway
              </span>
              <Smartphone className="text-brand h-4 w-4" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {statusLoading ? (
                <Spinner size="sm" />
              ) : status?.configured ? (
                <Badge variant={status.sandbox ? 'warning' : 'success'} dot>
                  {status.sandbox ? 'Arkesel Sandbox' : 'Arkesel Live'}
                </Badge>
              ) : (
                <Badge variant="danger" dot>
                  Not Configured
                </Badge>
              )}
              <span className="text-muted-foreground font-mono text-[11px]">
                ID: {status?.senderId || 'Verndly'}
              </span>
            </div>
          </div>

          <div className="border-border bg-card rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                Reachable Users
              </span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-foreground mt-1.5 text-2xl font-bold tabular-nums">
              {status?.stats.usersWithPhone ?? '—'}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {status?.stats.sellersWithPhone ?? 0} sellers with phone numbers
            </p>
          </div>

          <div className="border-border bg-card rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                Queued Recipients
              </span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-foreground mt-1.5 text-2xl font-bold tabular-nums">
              {uniqueTargetNumbers.length}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {selectedUsers.size} users · {validManualPhones.length} manual (deduped)
            </p>
          </div>

          <div className="border-border bg-card rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                Messages Delivered
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-foreground mt-1.5 text-2xl font-bold tabular-nums">
              {status?.stats.totalSent ?? 0}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              {status?.stats.totalCampaigns ?? 0} sends · {status?.stats.totalFailed ?? 0} failed
            </p>
          </div>
        </div>

        {/* ──────────────────── TAB 1: COMPOSE & SEND ──────────────────── */}
        {activeTab === 'compose' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* LEFT COLUMN (7 cols): User Directory Picker + Manual Ghana Numbers */}
            <div className="space-y-4 xl:col-span-7">
              {/* Recipient Picker Card */}
              <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-foreground text-sm font-semibold">1. Select Recipients</h3>
                    <p className="text-muted-foreground text-[11px]">
                      Numbers automatically convert from 10-digit{' '}
                      <code className="font-mono">0XXXXXXXXX</code> to{' '}
                      <code className="font-mono">233XXXXXXXXX</code>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedUsers.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUsers(new Map())}
                        className="h-8 text-xs"
                      >
                        Clear ({selectedUsers.size})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleAllVisible}
                      disabled={validVisibleUsers.length === 0}
                      className="h-8 text-xs"
                    >
                      {allVisibleSelected
                        ? 'Deselect Page'
                        : `Select Page (${validVisibleUsers.length})`}
                    </Button>
                  </div>
                </div>

                {/* Audience Segment Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {SEGMENTS.map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => {
                        setSegment(seg.id);
                        setRecipientsPage(1);
                      }}
                      className={cn(
                        'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                        segment === seg.id
                          ? 'bg-brand text-white'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {seg.label}
                    </button>
                  ))}
                </div>

                {/* Search + Filter Bar */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search by name, email, store name, or phone (0244… / 233…)…"
                      className="h-9 pl-8 text-xs"
                    />
                  </div>
                  <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={onlyWithPhone}
                      onChange={(e) => {
                        setOnlyWithPhone(e.target.checked);
                        setRecipientsPage(1);
                      }}
                      className="accent-brand h-3.5 w-3.5 rounded"
                    />
                    Only users with phone
                  </label>
                </div>

                {/* Selected Chips Tray */}
                {selectedUsers.size > 0 && (
                  <div className="border-border/60 bg-muted/30 flex flex-wrap items-center gap-1.5 rounded-xl border p-2.5">
                    <span className="text-muted-foreground mr-1 text-[10px] font-semibold uppercase tracking-wider">
                      Selected ({selectedUsers.size}):
                    </span>
                    {Array.from(selectedUsers.values())
                      .slice(0, 12)
                      .map((u) => (
                        <span
                          key={u.id}
                          className="bg-background border-border text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                        >
                          <span className="max-w-[110px] truncate">{u.full_name}</span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {u.formatted_phone}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleUserSelection(u)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Remove ${u.full_name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    {selectedUsers.size > 12 && (
                      <span className="text-muted-foreground text-[11px] font-medium">
                        +{selectedUsers.size - 12} more
                      </span>
                    )}
                  </div>
                )}

                {/* Recipients Table */}
                {recipientsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12">
                    <Spinner size="md" className="text-brand" />
                    <p className="text-muted-foreground text-xs">Loading recipients…</p>
                  </div>
                ) : recipients.length === 0 ? (
                  <TableEmpty
                    icon={Users}
                    title="No matching recipients"
                    description="Try clearing your search or switching audience segments."
                  />
                ) : (
                  <div className="max-h-[430px] overflow-auto rounded-xl border border-[var(--color-border)]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60 text-muted-foreground sticky top-0 z-10 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="w-9 px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={allVisibleSelected}
                              onChange={handleToggleAllVisible}
                              disabled={validVisibleUsers.length === 0}
                              aria-label="Select all valid users on page"
                              className="accent-brand h-3.5 w-3.5 cursor-pointer rounded"
                            />
                          </th>
                          <th className="px-3 py-2.5">User / Store</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Ghana SMS Format</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border/60 divide-y">
                        {recipients.map((u) => {
                          const isChecked = selectedUsers.has(u.id);
                          return (
                            <tr
                              key={u.id}
                              onClick={() => (u.phone_valid || u.email) && toggleUserSelection(u)}
                              className={cn(
                                'transition-colors',
                                u.phone_valid || u.email
                                  ? 'hover:bg-muted/40 cursor-pointer'
                                  : 'cursor-not-allowed opacity-55',
                                isChecked && 'bg-brand/5',
                              )}
                            >
                              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!u.phone_valid && !u.email}
                                  onChange={() => toggleUserSelection(u)}
                                  aria-label={`Select ${u.full_name}`}
                                  className="accent-brand h-3.5 w-3.5 cursor-pointer rounded"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <p className="text-foreground font-semibold">{u.full_name}</p>
                                <p className="text-muted-foreground truncate text-[11px]">
                                  {u.store_name ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Store className="h-3 w-3" />
                                      {u.store_name} · {u.email}
                                    </span>
                                  ) : (
                                    u.email
                                  )}
                                </p>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  <Badge
                                    variant={
                                      u.role === 'SELLER' || u.store_name ? 'brand' : 'outline'
                                    }
                                  >
                                    {u.role === 'SELLER' || u.store_name ? 'Seller' : u.role}
                                  </Badge>
                                  {u.is_seller_verified && (
                                    <Badge variant="success">Verified</Badge>
                                  )}
                                  {(u.role === 'SELLER' || u.store_name) &&
                                    !u.onboarding_completed && (
                                      <Badge variant="warning">Onboarding</Badge>
                                    )}
                                  {u.is_pro && <Badge variant="info">Pro</Badge>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                {u.phone_valid && u.formatted_phone ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                      <Phone className="h-2.5 w-2.5" />
                                      {u.formatted_phone}
                                    </span>
                                    <p className="text-muted-foreground mt-0.5 text-[10px]">
                                      {u.raw_phone !== u.formatted_phone
                                        ? `from ${u.raw_phone} · `
                                        : ''}
                                      {u.phone_source}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-red-500">
                                    <XCircle className="h-3 w-3" />
                                    {u.raw_phone ? `Invalid (${u.raw_phone})` : 'No phone'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">
                    Showing page {recipientsPage} of {recipientsTotalPages} ({recipientsTotal}{' '}
                    users)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recipientsPage <= 1}
                      onClick={() => setRecipientsPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-2.5 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recipientsPage >= recipientsTotalPages}
                      onClick={() =>
                        setRecipientsPage((p) => Math.min(recipientsTotalPages, p + 1))
                      }
                      className="h-8 px-2.5 text-xs"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual / Direct Phone Numbers Box */}
              <div className="border-border bg-card space-y-3 rounded-2xl border p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-foreground text-sm font-semibold">
                      Or Enter Phone Numbers Directly
                    </h3>
                    <p className="text-muted-foreground text-[11px]">
                      Paste one or more Ghana numbers (e.g.{' '}
                      <code className="font-mono">0244123456</code>,{' '}
                      <code className="font-mono">+233551234567</code>,{' '}
                      <code className="font-mono">233201234567</code>,{' '}
                      <code className="font-mono">244123456</code>) separated by commas or new
                      lines.
                    </p>
                  </div>
                  {manualInput.trim() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManualInput('')}
                      className="h-7 text-[11px]"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder={'0244123456\n0559876543, +233201112233'}
                  className="border-border bg-background text-foreground focus:ring-brand w-full rounded-xl border p-3 font-mono text-xs focus:outline-none focus:ring-1"
                />

                {/* Live Formatting Preview Chips */}
                {parsedManual.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                      Auto-Formatted Preview ({validManualPhones.length} valid
                      {invalidManualPhones.length > 0
                        ? `, ${invalidManualPhones.length} invalid`
                        : ''}
                      )
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedManual.map((entry, idx) =>
                        entry.valid && entry.normalized ? (
                          <span
                            key={`${entry.raw}-${idx}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {entry.raw !== entry.normalized ? (
                              <>
                                <span className="opacity-65">{entry.raw}</span>
                                <span>→</span>
                              </>
                            ) : null}
                            <span>{entry.normalized}</span>
                          </span>
                        ) : (
                          <span
                            key={`${entry.raw}-${idx}`}
                            title={entry.reason}
                            className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-red-600 dark:text-red-400"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>{entry.raw}</span>
                            <span className="font-sans text-[10px] font-normal opacity-80">
                              (invalid)
                            </span>
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (5 cols): Drafted Templates + Composer + Live Phone Preview */}
            <div className="space-y-4 xl:col-span-5">
              {/* Drafted Templates Card */}
              <div className="border-border bg-card space-y-3 rounded-2xl border p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="text-brand h-4 w-4" />
                    <h3 className="text-foreground text-sm font-semibold">2. Drafted Templates</h3>
                  </div>
                  <span className="text-muted-foreground text-[11px]">Click to load</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTemplateFilter(cat)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors',
                        templateFilter === cat
                          ? 'bg-foreground text-background'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid max-h-[250px] grid-cols-1 gap-2 overflow-y-auto pr-1">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = activeTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleLoadTemplate(tpl)}
                        className={cn(
                          'rounded-xl border p-3 text-left transition-all',
                          isSelected
                            ? 'border-brand bg-brand/5'
                            : 'border-border/70 bg-background/60 hover:border-brand/40 hover:bg-muted/40',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-foreground text-xs font-semibold">{tpl.title}</span>
                          <Badge variant="outline">{tpl.category}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-snug">
                          {tpl.body}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Composer Card */}
              <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-foreground text-sm font-semibold">3. Compose &amp; Send</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-[11px]">Sender ID:</span>
                    <input
                      type="text"
                      maxLength={11}
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      placeholder="Verndly"
                      className="border-border bg-background text-foreground h-7 w-24 rounded-lg border px-2 font-mono text-[11px] font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Personalization Variable Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground mr-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                    <Sparkles className="text-brand h-3 w-3" />
                    Personalize:
                  </span>
                  {PERSONALIZATION_TOKENS.map((item) => (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => handleInsertToken(item.token)}
                      className="bg-muted/70 text-foreground hover:bg-brand rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors hover:text-white"
                    >
                      + {item.token}
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div className="space-y-1.5">
                  <textarea
                    rows={5}
                    maxLength={960}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (
                        activeTemplateId &&
                        ADMIN_SMS_TEMPLATES.find((t) => t.id === activeTemplateId)?.body !==
                          e.target.value
                      ) {
                        setActiveTemplateId(null);
                      }
                    }}
                    placeholder="Write your SMS message here or select a drafted template above…"
                    className="border-border bg-background text-foreground focus:ring-brand w-full rounded-xl border p-3 text-xs leading-relaxed focus:outline-none focus:ring-1"
                  />

                  <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{smsMetrics.length} / 960 chars</span>
                      <span>·</span>
                      <span
                        className={cn(
                          'font-semibold',
                          smsMetrics.segments > 1 ? 'text-amber-600 dark:text-amber-400' : '',
                        )}
                      >
                        {smsMetrics.segments} SMS {smsMetrics.segments === 1 ? 'part' : 'parts'}
                      </span>
                      <span>·</span>
                      <span>{smsMetrics.encoding}</span>
                    </div>
                    <span className="text-foreground font-semibold">
                      Est. {estimatedCredits} credit{estimatedCredits === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Live Phone Preview */}
                {renderedPreview && (
                  <div className="border-border/70 bg-muted/30 space-y-2 rounded-2xl border p-3.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-semibold uppercase tracking-wider">
                        Live SMS Preview
                      </span>
                      <span className="text-muted-foreground font-mono">
                        To: {sampleRecipient.phone}
                      </span>
                    </div>
                    <div className="bg-background border-border/60 rounded-2xl rounded-tl-sm border p-3">
                      <p className="text-brand mb-1 font-mono text-[10px] font-bold">
                        {senderId || status?.senderId || 'Verndly'}
                      </p>
                      <p className="text-foreground whitespace-pre-wrap text-xs leading-relaxed">
                        {renderedPreview}
                      </p>
                    </div>
                  </div>
                )}

                {/* Send Action Button */}
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={
                    sending ||
                    uniqueTargetNumbers.length === 0 ||
                    message.trim().length < 2 ||
                    invalidManualPhones.length > 0
                  }
                  className="bg-brand hover:bg-brand-hover h-11 w-full text-xs font-semibold text-white"
                >
                  {sending ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Dispatching SMS…
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Send SMS to {uniqueTargetNumbers.length} Recipient
                      {uniqueTargetNumbers.length === 1 ? '' : 's'}
                    </>
                  )}
                </Button>

                <div className="text-muted-foreground flex items-center justify-center gap-1.5 text-[10px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>
                    Auto-deduplicated · Strict 12-digit Ghana{' '}
                    <code className="font-mono">233XXXXXXXXX</code> · Audit logged
                  </span>
                </div>
              </div>
            </div>

            <div className="min-w-0 xl:col-span-12">
              <AdminEmailSection selectedUsers={selectedUsers} />
            </div>
          </div>
        )}

        {/* ──────────────────── TAB 2: DELIVERY HISTORY ──────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20">
                <Spinner size="lg" className="text-brand" />
                <p className="text-muted-foreground text-xs">Loading SMS delivery history…</p>
              </div>
            ) : history.length === 0 ? (
              <TableEmpty
                icon={MessageSquare}
                title="No SMS campaigns sent yet"
                description="Every SMS sent from the Admin SMS Center is recorded here with per-recipient delivery status."
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Sender / Mode</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {dateTime(item.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          <p className="text-foreground line-clamp-2 text-xs font-medium">
                            {item.message}
                          </p>
                          {item.templateId && (
                            <span className="text-muted-foreground font-mono text-[10px]">
                              Template: {item.templateId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline">{item.senderId}</Badge>
                            {item.sandbox && <Badge variant="warning">Sandbox</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="success">{item.sentCount} sent</Badge>
                            {item.failedCount > 0 && (
                              <Badge variant="danger">{item.failedCount} failed</Badge>
                            )}
                            {item.invalidCount > 0 && (
                              <Badge variant="warning">{item.invalidCount} invalid</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-xs">
                          {item.actor?.full_name || item.actor?.email || 'Admin'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInspectLog(item)}
                              className="h-7 px-2.5 text-[11px]"
                            >
                              Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMessage(item.message);
                                setActiveTemplateId(item.templateId);
                                setActiveTab('compose');
                                success('Message loaded into composer');
                              }}
                              className="h-7 px-2.5 text-[11px]"
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Reuse
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Page {historyPage} of {historyTotalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-2.5 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage >= historyTotalPages}
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      className="h-8 px-2.5 text-xs"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Delivery Receipt Modal (Right after sending) */}
        <Modal
          isOpen={Boolean(lastReceipt)}
          onClose={() => setLastReceipt(null)}
          title="SMS Delivery Report"
          description={
            lastReceipt
              ? `Sender: ${lastReceipt.senderId}${lastReceipt.sandbox ? ' (Sandbox)' : ''} · ${lastReceipt.sentCount} sent, ${lastReceipt.failedCount} failed, ${lastReceipt.invalidCount} invalid`
              : ''
          }
          maxWidth="lg"
        >
          {lastReceipt && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {lastReceipt.sentCount}
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Sent
                  </p>
                </div>
                <div className="rounded-xl bg-red-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {lastReceipt.failedCount}
                  </p>
                  <p className="text-[11px] font-medium text-red-700 dark:text-red-300">Failed</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {lastReceipt.invalidCount}
                  </p>
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    Invalid
                  </p>
                </div>
              </div>

              <div className="border-border max-h-72 overflow-y-auto rounded-xl border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground sticky top-0 text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Number (233)</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/60 divide-y">
                    {lastReceipt.results.map((r, i) => (
                      <tr key={`${r.formattedPhone || r.rawPhone}-${i}`}>
                        <td className="text-foreground px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 font-mono">{r.formattedPhone || r.rawPhone}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              r.status === 'sent'
                                ? 'success'
                                : r.status === 'failed'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground px-3 py-2 text-[11px]">
                          {r.error || (r.providerId ? `ID: ${r.providerId}` : 'Accepted')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={() => setLastReceipt(null)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Historical Campaign Inspector Modal */}
        <Modal
          isOpen={Boolean(inspectLog)}
          onClose={() => setInspectLog(null)}
          title="SMS Campaign Details"
          description={inspectLog ? `Sent ${dateTime(inspectLog.created_at)}` : ''}
          maxWidth="lg"
        >
          {inspectLog && (
            <div className="space-y-4 text-xs">
              <div className="border-border bg-muted/40 rounded-xl border p-3">
                <p className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase">
                  Message ({inspectLog.senderId})
                </p>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {inspectLog.message}
                </p>
              </div>

              <div className="border-border max-h-72 overflow-y-auto rounded-xl border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground sticky top-0 text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/60 divide-y">
                    {inspectLog.recipients.map((r, idx) => (
                      <tr key={`${r.formattedPhone || r.rawPhone}-${idx}`}>
                        <td className="text-foreground px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 font-mono">{r.formattedPhone || r.rawPhone}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={
                              r.status === 'sent'
                                ? 'success'
                                : r.status === 'failed'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground px-3 py-2 text-[11px]">
                          {r.error || (r.providerId ? `ID: ${r.providerId}` : 'Delivered')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
