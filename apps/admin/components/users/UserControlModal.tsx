'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Trash2,
  KeyRound,
  Sparkles,
  Store,
  Package,
  ShoppingBag,
  Flag,
  Send,
  Mail,
  RotateCcw,
  ExternalLink,
  RefreshCw,
  MapPin,
  CreditCard,
  Save,
  Lock,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { dateShort, dateTime, formatCurrency, shortId } from '@/lib/format';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useAuth } from '@/contexts/AuthContext';
import { VendlyUserService } from '@/services/user.service';
import type { AdminUserDetail, UserRole } from '@/types/operations';

const STOREFRONT_BASE_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://verndly.com';

type DossierTab = 'overview' | 'store' | 'activity' | 'controls';

interface UserControlModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onMutated: () => Promise<void> | void;
}

export function UserControlModal({ userId, isOpen, onClose, onMutated }: UserControlModalProps) {
  const { user: currentAdmin } = useAuth();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [tab, setTab] = useState<DossierTab>('overview');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);

  // Inline edit forms
  const [editProfile, setEditProfile] = useState({
    full_name: '',
    email: '',
    school: '',
    phone_e164: '',
    reason: '',
  });
  const [editStore, setEditStore] = useState({
    store_name: '',
    store_link: '',
    bio: '',
    whatsapp_number: '',
    location: '',
    area: '',
    payment_timing: '',
    service_area: '',
    avg_delivery_time: '',
    onboarding_completed: false,
    reason: '',
  });

  // Control action inputs
  const [suspendReason, setSuspendReason] = useState('');
  const [warnReason, setWarnReason] = useState('');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  const hydrateForms = (d: AdminUserDetail) => {
    setEditProfile({
      full_name: d.user.full_name || '',
      email: d.user.email || '',
      school: d.user.school || '',
      phone_e164: d.user.phone_e164 || '',
      reason: '',
    });
    if (d.user.seller_profile) {
      const s = d.user.seller_profile;
      setEditStore({
        store_name: s.store_name || '',
        store_link: s.store_link || '',
        bio: s.bio || '',
        whatsapp_number: s.whatsapp_number || '',
        location: s.location || '',
        area: s.area || '',
        payment_timing: s.payment_timing || '',
        service_area: s.service_area || '',
        avg_delivery_time: s.avg_delivery_time || '',
        onboarding_completed: Boolean(s.onboarding_completed),
        reason: '',
      });
    }
  };

  const loadDetail = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const d = await VendlyUserService.getUserById(userId);
      setDetail(d);
      hydrateForms(d);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load user dossier');
    } finally {
      setLoading(false);
    }
  }, [userId, toastError]);

  useEffect(() => {
    if (isOpen && userId) {
      setTab('overview');
      setDeleteConfirmText('');
      setDeleteReason('');
      setSuspendReason('');
      setWarnReason('');
      setNotifyTitle('');
      setNotifyBody('');
      void loadDetail();
    } else if (!isOpen) {
      setDetail(null);
    }
  }, [isOpen, userId, loadDetail]);

  const u = detail?.user ?? null;
  const store = u?.seller_profile ?? null;
  const isSelf = Boolean(currentAdmin?.id && u?.id && currentAdmin.id === u.id);

  const runAction = async (fn: () => Promise<{ message?: string } | unknown>, okMsg?: string) => {
    setActionLoading(true);
    try {
      const res: any = await fn();
      success(okMsg || res?.message || 'Action completed');
      await Promise.all([loadDetail(), onMutated()]);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (nextRole: UserRole) => {
    if (!u || u.role === nextRole) return;
    const ok = await confirm({
      title: `Change Role to ${nextRole}`,
      description:
        nextRole === 'ADMIN'
          ? `Grant FULL Super Admin privileges to ${u.full_name || u.email}? They will have restricted access to platform operations.`
          : `Change ${u.full_name || u.email}'s permission role from ${u.role} to ${nextRole}?`,
      confirmText: `Set Role: ${nextRole}`,
      variant: nextRole === 'ADMIN' ? 'danger' : 'warning',
    });
    if (!ok) return;
    await runAction(() => VendlyUserService.updateRole(u.id, nextRole));
  };

  const handleToggleSuspension = async () => {
    if (!u) return;
    const suspending = !u.is_suspended;
    const ok = await confirm({
      title: suspending ? 'Suspend User Account' : 'Lift Account Suspension',
      description: suspending
        ? `Suspend ${u.full_name || u.email}? Their login, storefront, and listings will be blocked immediately.`
        : `Restore access for ${u.full_name || u.email}?`,
      confirmText: suspending ? 'Suspend Account' : 'Lift Suspension',
      variant: suspending ? 'danger' : 'warning',
    });
    if (!ok) return;
    await runAction(() =>
      VendlyUserService.toggleSuspension(u.id, suspendReason.trim() || undefined),
    );
    setSuspendReason('');
  };

  const handleToggleVerify = async () => {
    if (!u) return;
    const next = !u.is_verified;
    const ok = await confirm({
      title: next ? 'Verify Account' : 'Revoke Verification',
      description: next
        ? `Mark ${u.full_name || u.email} as verified on Verndly?`
        : `Revoke verified badge from ${u.full_name || u.email}?`,
      confirmText: next ? 'Verify Account' : 'Revoke Badge',
      variant: 'warning',
    });
    if (!ok) return;
    await runAction(() => VendlyUserService.setVerification(u.id, next));
  };

  const handleWarn = async () => {
    if (!u) return;
    if (warnReason.trim().length < 2) {
      toastError('Enter a reason before issuing a warning.');
      return;
    }
    await runAction(() => VendlyUserService.warnUser(u.id, warnReason.trim()));
    setWarnReason('');
  };

  const handleResetWarnings = async () => {
    if (!u) return;
    const ok = await confirm({
      title: 'Reset Warning Count',
      description: `Clear all ${u.warnings} warning(s) on ${u.full_name || u.email}?`,
      confirmText: 'Clear Warnings',
      variant: 'warning',
    });
    if (!ok) return;
    await runAction(() => VendlyUserService.resetWarnings(u.id));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u) return;
    await runAction(() =>
      VendlyUserService.updateProfile(u.id, {
        full_name: editProfile.full_name,
        email: editProfile.email,
        school: editProfile.school,
        phone_e164: editProfile.phone_e164 || null,
        reason: editProfile.reason || undefined,
      }),
    );
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u || !store) return;
    await runAction(() =>
      VendlyUserService.updateStore(u.id, {
        store_name: editStore.store_name,
        store_link: editStore.store_link,
        bio: editStore.bio || null,
        whatsapp_number: editStore.whatsapp_number || null,
        location: editStore.location || null,
        area: editStore.area || null,
        payment_timing: editStore.payment_timing || undefined,
        service_area: editStore.service_area || undefined,
        avg_delivery_time: editStore.avg_delivery_time || undefined,
        onboarding_completed: editStore.onboarding_completed,
        reason: editStore.reason || undefined,
      }),
    );
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u) return;
    if (notifyTitle.trim().length < 2 || notifyBody.trim().length < 2) {
      toastError('Provide both a notification title and message.');
      return;
    }
    await runAction(() =>
      VendlyUserService.notifyUser(u.id, {
        title: notifyTitle.trim(),
        body: notifyBody.trim(),
      }),
    );
    setNotifyTitle('');
    setNotifyBody('');
  };

  const handlePermanentDelete = async () => {
    if (!u) return;
    if (
      deleteConfirmText.trim().toUpperCase() !== 'DELETE' &&
      deleteConfirmText.trim().toLowerCase() !== u.email.toLowerCase()
    ) {
      toastError(`Type DELETE or "${u.email}" to confirm permanent deletion.`);
      return;
    }
    setActionLoading(true);
    try {
      const res = await VendlyUserService.executeDeletion(
        u.id,
        deleteConfirmText.trim(),
        deleteReason.trim() || undefined,
      );
      success(res.message || 'Account permanently deleted');
      await onMutated();
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Permanent deletion failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={u ? u.full_name || 'User Dossier' : 'Loading User Dossier...'}
      description={
        u
          ? `${u.email} • ${u.role}${store ? ` • Store: ${store.store_name} (@${store.store_link})` : ''}`
          : ''
      }
      maxWidth="2xl"
    >
      {loading && !detail ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <Spinner size="lg" className="text-brand" />
          <p className="text-muted-foreground text-xs">
            Loading full user, seller &amp; store dossier…
          </p>
        </div>
      ) : !u ? (
        <div className="text-muted-foreground py-12 text-center text-xs">
          Unable to load user data.
        </div>
      ) : (
        <div className="space-y-5 text-xs">
          {/* Status Badges & Self-Protection Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={u.role === 'ADMIN' ? 'brand' : u.role === 'SELLER' ? 'info' : 'default'}
              >
                {u.role}
              </Badge>
              {u.is_verified ? (
                <Badge variant="success" dot>
                  Verified
                </Badge>
              ) : (
                <Badge variant="default" dot>
                  Unverified
                </Badge>
              )}
              {u.is_suspended && (
                <Badge variant="danger" dot>
                  Suspended
                </Badge>
              )}
              {u.deletion_scheduled_for && (
                <Badge variant="danger" dot>
                  Deleting {dateShort(u.deletion_scheduled_for)}
                </Badge>
              )}
              {u.disabled_at && !u.deletion_scheduled_for && (
                <Badge variant="warning" dot>
                  Self-Disabled
                </Badge>
              )}
              {u.is_pro && (
                <Badge variant="brand">
                  Pro{u.pro_expires_at ? ` until ${dateShort(u.pro_expires_at)}` : ''}
                </Badge>
              )}
              {u.warnings > 0 && <Badge variant="warning">{u.warnings} Warning(s)</Badge>}
            </div>

            <button
              type="button"
              onClick={() => void loadDetail()}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isSelf && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>
                You are viewing your own Super Admin account. Self-demotion, self-suspension, and
                self-deletion are locked.
              </span>
            </div>
          )}

          {/* Dossier Navigation Tabs */}
          <div className="border-border flex flex-wrap items-center gap-1.5 border-b pb-3">
            {(
              [
                { id: 'overview', label: 'Profile & Info', icon: Shield },
                ...(store ? [{ id: 'store', label: 'Store & Financials', icon: Store }] : []),
                { id: 'activity', label: 'Orders & Reports', icon: ShoppingBag },
                { id: 'controls', label: 'Restricted Controls', icon: Lock },
              ] as Array<{ id: DossierTab; label: string; icon: React.ElementType }>
            ).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-foreground text-background'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* ── TAB 1: OVERVIEW & PROFILE ─────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* Complete Identity Grid */}
              <div className="bg-muted/30 border-border grid grid-cols-2 gap-3 rounded-xl border p-4 sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">User ID</span>
                  <p className="text-foreground mt-0.5 font-mono text-[11px]">{u.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">Email</span>
                  <p className="text-foreground mt-0.5 break-all font-medium">{u.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">Phone</span>
                  <p className="text-foreground mt-0.5 font-medium">{u.phone_e164 || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">
                    School / Campus
                  </span>
                  <p className="text-foreground mt-0.5 font-medium">{u.school || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">
                    Auth &amp; 2FA
                  </span>
                  <p className="text-foreground mt-0.5 font-medium">
                    {u.oauth_provider ? `OAuth (${u.oauth_provider})` : 'Password'} •{' '}
                    {u.totp_enabled ? `2FA (${u.totp_method || 'TOTP'})` : 'No 2FA'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase">Joined</span>
                  <p className="text-foreground mt-0.5 font-medium">{dateTime(u.created_at)}</p>
                </div>
                {u.verification_doc && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-muted-foreground text-[10px] uppercase">
                      Verification Document
                    </span>
                    <a
                      href={u.verification_doc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand mt-0.5 inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      Open Submitted Document <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Edit User Profile Form */}
              <form
                onSubmit={handleSaveProfile}
                className="bg-card border-border space-y-3 rounded-xl border p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-foreground text-xs font-semibold">Edit User Profile</h4>
                  <span className="text-muted-foreground text-[10px]">Audit-logged</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                      Full Name
                    </label>
                    <Input
                      value={editProfile.full_name}
                      onChange={(e) => setEditProfile((p) => ({ ...p, full_name: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={editProfile.email}
                      onChange={(e) => setEditProfile((p) => ({ ...p, email: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                      Phone (E.164 / Local)
                    </label>
                    <Input
                      value={editProfile.phone_e164}
                      onChange={(e) =>
                        setEditProfile((p) => ({ ...p, phone_e164: e.target.value }))
                      }
                      placeholder="+233..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                      School / Affiliation
                    </label>
                    <Input
                      value={editProfile.school}
                      onChange={(e) => setEditProfile((p) => ({ ...p, school: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={editProfile.reason}
                    onChange={(e) => setEditProfile((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="Optional audit reason for profile change…"
                    className="h-8 flex-1 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={actionLoading}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Profile
                  </Button>
                </div>
              </form>

              {/* Saved Addresses */}
              {u.addresses && u.addresses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5" /> Saved Delivery Addresses (
                    {u.addresses.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {u.addresses.map((a) => (
                      <div key={a.id} className="bg-muted/20 border-border rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground font-semibold">{a.name}</span>
                          {a.is_default && <Badge variant="info">Default</Badge>}
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-[11px]">
                          {a.street}, {a.city}
                          {a.region ? `, ${a.region}` : ''}
                        </p>
                        <p className="text-muted-foreground text-[11px]">{a.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification History */}
              {u.admin_approvals && u.admin_approvals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                    Verification Submissions ({u.admin_approvals.length})
                  </h4>
                  <div className="space-y-1.5">
                    {u.admin_approvals.map((ap) => (
                      <div
                        key={ap.id}
                        className="bg-muted/20 border-border flex items-center justify-between rounded-xl border px-3 py-2"
                      >
                        <div>
                          <span className="text-foreground font-medium">{ap.type}</span>
                          <span className="text-muted-foreground ml-2 text-[11px]">
                            Submitted {dateShort(ap.created_at)}
                          </span>
                        </div>
                        <Badge
                          variant={
                            ap.status === 'APPROVED'
                              ? 'success'
                              : ap.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {ap.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: STORE & FINANCIALS ─────────────────────────────────────── */}
          {tab === 'store' && store && (
            <div className="space-y-5">
              {/* Store Overview Header + Live Link */}
              <div className="bg-muted/30 border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logo_url}
                        alt={store.store_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store className="text-muted-foreground h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-bold">{store.store_name}</p>
                    <p className="text-muted-foreground text-[11px]">
                      @{store.store_link} • {store.location || 'No city'}{' '}
                      {store.area ? `(${store.area})` : ''} • WhatsApp:{' '}
                      {store.whatsapp_number || '—'}
                    </p>
                  </div>
                </div>
                <a
                  href={`${STOREFRONT_BASE_URL}/s/${store.store_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                >
                  Open Live Storefront <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Financial & Payout Snapshot */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="bg-card border-border rounded-xl border p-3">
                  <span className="text-muted-foreground text-[10px] uppercase">Available</span>
                  <p className="text-foreground mt-1 text-sm font-bold">
                    {formatCurrency(store.balance_snapshot?.available_balance ?? 0)}
                  </p>
                </div>
                <div className="bg-card border-border rounded-xl border p-3">
                  <span className="text-muted-foreground text-[10px] uppercase">
                    Pending Escrow
                  </span>
                  <p className="mt-1 text-sm font-bold text-amber-500">
                    {formatCurrency(store.balance_snapshot?.pending_balance ?? 0)}
                  </p>
                </div>
                <div className="bg-card border-border rounded-xl border p-3">
                  <span className="text-muted-foreground text-[10px] uppercase">Total Earned</span>
                  <p className="mt-1 text-sm font-bold text-emerald-500">
                    {formatCurrency(store.balance_snapshot?.total_earned ?? 0)}
                  </p>
                </div>
                <div className="bg-card border-border rounded-xl border p-3">
                  <span className="text-muted-foreground text-[10px] uppercase">Withdrawn</span>
                  <p className="text-foreground mt-1 text-sm font-bold">
                    {formatCurrency(store.balance_snapshot?.total_withdrawn ?? 0)}
                  </p>
                </div>
              </div>

              {/* Bank & Paystack Subaccount Box */}
              <div className="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div className="space-y-1">
                  <p className="text-foreground flex items-center gap-1.5 font-semibold">
                    <CreditCard className="h-3.5 w-3.5" /> Settlement &amp; Paystack Subaccount
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Bank:{' '}
                    <strong className="text-foreground">{store.bank_name || 'Not set'}</strong> •
                    Account:{' '}
                    <strong className="text-foreground font-mono">
                      {store.account_number || '—'}
                    </strong>
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Subaccount Code:{' '}
                    <strong className="text-foreground font-mono">
                      {store.paystack_subaccount_code || 'Not provisioned'}
                    </strong>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading || !store.account_number}
                  onClick={() => void runAction(() => VendlyUserService.retryStoreSubaccount(u.id))}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  {store.paystack_subaccount_code ? 'Sync Subaccount' : 'Provision Subaccount'}
                </Button>
              </div>

              {/* Edit Store Form */}
              <form
                onSubmit={handleSaveStore}
                className="bg-card border-border space-y-3 rounded-xl border p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-foreground text-xs font-semibold">Edit Storefront Details</h4>
                  <label className="text-foreground inline-flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={editStore.onboarding_completed}
                      onChange={(e) =>
                        setEditStore((s) => ({ ...s, onboarding_completed: e.target.checked }))
                      }
                    />
                    Onboarding Completed
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                      Store Name
                    </label>
                    <Input
                      value={editStore.store_name}
                      onChange={(e) => setEditStore((s) => ({ ...s, store_name: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                      Store Handle (@slug)
                    </label>
                    <Input
                      value={editStore.store_link}
                      onChange={(e) => setEditStore((s) => ({ ...s, store_link: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                      WhatsApp Number
                    </label>
                    <Input
                      value={editStore.whatsapp_number}
                      onChange={(e) =>
                        setEditStore((s) => ({ ...s, whatsapp_number: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                      Location / City
                    </label>
                    <Input
                      value={editStore.location}
                      onChange={(e) => setEditStore((s) => ({ ...s, location: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block text-[10px] uppercase">
                    Store Bio
                  </label>
                  <textarea
                    rows={2}
                    value={editStore.bio}
                    onChange={(e) => setEditStore((s) => ({ ...s, bio: e.target.value }))}
                    className="bg-background border-border text-foreground w-full resize-none rounded-xl border p-2.5 text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={editStore.reason}
                    onChange={(e) => setEditStore((s) => ({ ...s, reason: e.target.value }))}
                    placeholder="Audit reason for store edit…"
                    className="h-8 flex-1 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={actionLoading}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Store
                  </Button>
                </div>
              </form>

              {/* Store Products List */}
              <div className="space-y-2">
                <h4 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                  <Package className="h-3.5 w-3.5" /> Store Products (
                  {detail?.stats?.productCount ?? detail?.products.length ?? 0})
                </h4>
                {detail && detail.products.length > 0 ? (
                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {detail.products.map((p) => (
                      <div
                        key={p.id}
                        className="bg-muted/20 border-border flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-foreground truncate font-medium">{p.title}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {p.category} • Stock: {p.quantity_available} • Views: {p.views_count}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-foreground font-mono font-semibold">
                            {formatCurrency(p.price)}
                          </span>
                          <Badge
                            variant={
                              p.status === 'active' || p.status === 'published'
                                ? 'success'
                                : p.status === 'rejected'
                                  ? 'danger'
                                  : 'default'
                            }
                          >
                            {p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-[11px]">No products listed yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: ACTIVITY, ORDERS & REPORTS ─────────────────────────────── */}
          {tab === 'activity' && detail && (
            <div className="space-y-5">
              {/* Buyer Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="bg-card border-border rounded-xl border p-3">
                  <span className="text-muted-foreground text-[10px] uppercase">Buyer Orders</span>
                  <p className="text-foreground mt-1 text-base font-bold">
                    {detail.buyerStats.totalOrders}
                  </p>
                </div>
                <div className="bg-card border-border rounded-xl border p-3">
                  <span className="text-muted-foreground text-[10px] uppercase">Total Spent</span>
                  <p className="text-foreground mt-1 text-base font-bold">
                    {formatCurrency(detail.buyerStats.totalSpent)}
                  </p>
                </div>
                <div className="bg-card border-border rounded-xl border p-3">
                  <span className="text-muted-foreground text-[10px] uppercase">Seller Orders</span>
                  <p className="text-foreground mt-1 text-base font-bold">
                    {detail.stats?.totalOrders ?? 0}
                  </p>
                </div>
                <div className="bg-card border-border rounded-xl border p-3">
                  <span className="text-muted-foreground text-[10px] uppercase">
                    Reports Against
                  </span>
                  <p
                    className={`mt-1 text-base font-bold ${
                      detail.reportsReceived.length > 0 ? 'text-rose-500' : 'text-foreground'
                    }`}
                  >
                    {detail.reportsReceived.length}
                  </p>
                </div>
              </div>

              {/* Recent Buyer Orders */}
              <div className="space-y-2">
                <h4 className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  Recent Purchases ({detail.buyerStats.recentOrders.length})
                </h4>
                {detail.buyerStats.recentOrders.length === 0 ? (
                  <p className="text-muted-foreground text-[11px]">No purchases yet.</p>
                ) : (
                  <div className="max-h-44 space-y-1.5 overflow-y-auto">
                    {detail.buyerStats.recentOrders.map((o) => (
                      <div
                        key={o.id}
                        className="bg-muted/20 border-border flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-foreground truncate font-medium">
                            #{shortId(o.id)} — {o.items_summary || 'Order'}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {dateTime(o.created_at)} • {o.delivery_method || 'Standard'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-mono font-semibold">
                            {formatCurrency(o.total_amount)}
                          </span>
                          <Badge variant="default">{o.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reports Received (Trust & Safety) */}
              {detail.reportsReceived.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-500">
                    <Flag className="h-3.5 w-3.5" /> Reports Against This Seller (
                    {detail.reportsReceived.length})
                  </h4>
                  <div className="space-y-1.5">
                    {detail.reportsReceived.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2"
                      >
                        <div>
                          <p className="text-foreground font-medium">
                            {r.target_type} • {r.reason}
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            {dateTime(r.created_at)}
                            {r.resolution_action ? ` • Action: ${r.resolution_action}` : ''}
                          </p>
                        </div>
                        <Badge variant={r.status === 'OPEN' ? 'danger' : 'default'}>
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: RESTRICTED SUPER-ADMIN CONTROLS ────────────────────────── */}
          {tab === 'controls' && (
            <div className="space-y-3">
              {/* Role Management */}
              <div className="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5">
                <div>
                  <p className="text-foreground font-semibold">Permission Role</p>
                  <p className="text-muted-foreground text-[11px]">
                    Promote to Seller/Admin or demote. Last active Admin is protected.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(['USER', 'SELLER', 'ADMIN'] as UserRole[]).map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={u.role === r ? 'primary' : 'outline'}
                      disabled={actionLoading || u.role === r || isSelf}
                      onClick={() => void handleRoleChange(r)}
                      className="h-7 px-2.5 text-xs"
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Verification Override */}
              <div className="bg-card border-border flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5">
                <div>
                  <p className="text-foreground font-semibold">Verification Status</p>
                  <p className="text-muted-foreground text-[11px]">
                    Directly grant or revoke the Verified badge.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => void handleToggleVerify()}
                  className="h-7 gap-1.5 text-xs"
                >
                  {u.is_verified ? (
                    <>
                      <ShieldOff className="h-3.5 w-3.5 text-amber-500" />
                      Revoke Verification
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Mark Verified
                    </>
                  )}
                </Button>
              </div>

              {/* Suspension Control with Reason */}
              <div className="bg-card border-border space-y-2 rounded-xl border p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-foreground font-semibold">
                      {u.is_suspended ? 'Lift Suspension' : 'Suspend Account'}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Immediately blocks login and hides storefront/products from buyers.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={u.is_suspended ? 'primary' : 'outline'}
                    disabled={actionLoading || isSelf}
                    onClick={() => void handleToggleSuspension()}
                    className={`h-7 gap-1.5 text-xs ${
                      !u.is_suspended ? 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10' : ''
                    }`}
                  >
                    <Ban className="h-3 w-3" />
                    {u.is_suspended ? 'Reinstate Account' : 'Suspend Account'}
                  </Button>
                </div>
                {!u.is_suspended && !isSelf && (
                  <Input
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Reason for suspension (sent in email & audit log)…"
                    className="h-8 text-xs"
                  />
                )}
              </div>

              {/* Warnings Control (Issue + Reset) */}
              <div className="bg-card border-border space-y-2 rounded-xl border p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-foreground font-semibold">Warnings ({u.warnings})</p>
                    <p className="text-muted-foreground text-[11px]">
                      Issue an official warning notification or clear existing strikes.
                    </p>
                  </div>
                  {u.warnings > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => void handleResetWarnings()}
                      className="h-7 gap-1 text-xs"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Clear Warnings
                    </Button>
                  )}
                </div>
                {!isSelf && (
                  <div className="flex gap-2">
                    <Input
                      value={warnReason}
                      onChange={(e) => setWarnReason(e.target.value)}
                      placeholder="Enter official warning message…"
                      className="h-8 flex-1 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || warnReason.trim().length < 2}
                      onClick={() => void handleWarn()}
                      className="h-8 border-amber-500/30 text-xs text-amber-500 hover:bg-amber-500/10"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Warn
                    </Button>
                  </div>
                )}
              </div>

              {/* Pro Membership Control */}
              <div className="bg-card border-border flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3.5">
                <div>
                  <p className="text-foreground font-semibold">Pro Subscription</p>
                  <p className="text-muted-foreground text-[11px]">
                    {u.is_pro
                      ? `Active Pro${u.pro_expires_at ? ` until ${dateShort(u.pro_expires_at)}` : ''}`
                      : 'Standard Free Plan'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() =>
                      void runAction(
                        () =>
                          VendlyUserService.setProStatus(u.id, { is_pro: true, duration_days: 30 }),
                        'Granted 30 days of Pro',
                      )
                    }
                    className="h-7 text-xs"
                  >
                    <Sparkles className="text-brand mr-1 h-3 w-3" />
                    +30d Pro
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() =>
                      void runAction(
                        () =>
                          VendlyUserService.setProStatus(u.id, { is_pro: true, duration_days: 90 }),
                        'Granted 90 days of Pro',
                      )
                    }
                    className="h-7 text-xs"
                  >
                    +90d Pro
                  </Button>
                  {u.is_pro && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() =>
                        void runAction(
                          () => VendlyUserService.setProStatus(u.id, { is_pro: false }),
                          'Pro status revoked',
                        )
                      }
                      className="h-7 text-xs text-rose-500 hover:bg-rose-500/10"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </div>

              {/* Account Lifecycle Overrides (Disabled / Scheduled Deletion) */}
              {(u.disabled_at || u.deletion_scheduled_for) && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                  <div>
                    <p className="text-foreground font-semibold">Account Lifecycle Override</p>
                    <p className="text-muted-foreground text-[11px]">
                      {u.deletion_scheduled_for
                        ? `Scheduled for permanent deletion on ${dateTime(u.deletion_scheduled_for)}`
                        : `Self-disabled on ${dateTime(u.disabled_at!)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {u.deletion_scheduled_for ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => void runAction(() => VendlyUserService.cancelDeletion(u.id))}
                        className="h-7 text-xs text-emerald-600"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Cancel Deletion
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => void runAction(() => VendlyUserService.reactivateUser(u.id))}
                        className="h-7 text-xs text-emerald-600"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Reactivate Account
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Security Actions: 2FA Reset + Password Reset */}
              <div className="bg-card border-border flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3.5">
                <div>
                  <p className="text-foreground font-semibold">Account Security &amp; Recovery</p>
                  <p className="text-muted-foreground text-[11px]">
                    Reset locked 2FA or dispatch a password reset link to {u.email}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => void runAction(() => VendlyUserService.sendPasswordReset(u.id))}
                    className="h-7 gap-1 text-xs"
                  >
                    <Mail className="h-3 w-3" />
                    Send Password Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading || !u.totp_enabled}
                    onClick={() => void runAction(() => VendlyUserService.forceDisable2fa(u.id))}
                    className="h-7 gap-1 text-xs"
                  >
                    <KeyRound className="h-3 w-3" />
                    Disable 2FA
                  </Button>
                </div>
              </div>

              {/* Direct In-App Notification */}
              <form
                onSubmit={handleSendNotification}
                className="bg-card border-border space-y-2 rounded-xl border p-3.5"
              >
                <p className="text-foreground font-semibold">Send Direct In-App Notice</p>
                <Input
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  placeholder="Notice title (e.g. Action required on your store)…"
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Input
                    value={notifyBody}
                    onChange={(e) => setNotifyBody(e.target.value)}
                    placeholder="Write message to deliver directly to this user's notifications…"
                    className="h-8 flex-1 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={actionLoading}
                    className="h-8 gap-1 text-xs"
                  >
                    <Send className="h-3 w-3" />
                    Send
                  </Button>
                </div>
              </form>

              {/* Restricted Danger Zone: Permanent Deletion with Typed Confirmation */}
              {!isSelf && (
                <div className="space-y-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                  <div>
                    <p className="font-semibold text-rose-600 dark:text-rose-400">
                      Danger Zone — Permanent Account &amp; Products Deletion
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      Hard-deletes all seller products and Cloudinary media, retires store link,
                      snapshots order history, and permanently deletes/anonymizes this account. Type{' '}
                      <strong className="text-foreground font-mono">DELETE</strong> or the
                      user&apos;s email to unlock.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE or exact email"
                      className="h-8 text-xs"
                    />
                    <Input
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Audit reason (optional)"
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      actionLoading ||
                      (deleteConfirmText.trim().toUpperCase() !== 'DELETE' &&
                        deleteConfirmText.trim().toLowerCase() !== u.email.toLowerCase())
                    }
                    onClick={() => void handlePermanentDelete()}
                    className="h-8 gap-1.5 border-rose-600 bg-rose-600 text-xs text-white hover:bg-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Execute Permanent Deletion
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
