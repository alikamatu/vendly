'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Mail,
  Building,
  Phone,
  Shield,
  Loader2,
  Check,
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  MailWarning,
  Star,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { authApi } from '@/lib/api/auth';
import { sanitizeText } from '@/lib/utils/sanitize';

// ─── Gradient helper ──────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-500',
  'from-indigo-500 to-violet-600',
  'from-amber-500 to-orange-600',
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

// ─── Shared field components ──────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={[
        'border-[var(--color-border)]/80 h-12 w-full rounded-2xl border px-4',
        'bg-[var(--color-background)] text-[13px] font-normal text-[var(--color-foreground)]',
        'placeholder:text-[var(--color-muted)]/40',
        'focus:ring-[var(--color-accent)]/10 outline-none focus:border-[var(--color-accent)] focus:ring-4',
        'shadow-xs transition-all duration-200',
        disabled
          ? 'bg-[var(--color-surface)]/50 cursor-not-allowed opacity-60'
          : 'hover:border-[var(--color-border)]',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountProfilePage() {
  const { user, token, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  // Local-format Ghana digits only. We render +233 as a fixed prefix.
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(user.full_name ?? '');

      setSchool(user.school ?? '');
      const stored = user.phone_e164 || '';
      const local = stored.startsWith('+233')
        ? stored.slice(4)
        : stored.replace(/^\+/, '');
      setPhone(local);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const cleanName = sanitizeText(name, 100).trim();
    const cleanSchool = sanitizeText(school, 200).trim();
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');

    if (cleanName.length < 2) {
      setMsg({ ok: false, text: 'Full name must be at least 2 characters.' });
      return;
    }
    if (cleanPhone && cleanPhone.length < 7) {
      setMsg({
        ok: false,
        text: 'Phone number looks too short. Use a Ghana number, e.g. 024 412 3456.',
      });
      return;
    }

    setIsLoading(true);
    setMsg(null);

    try {
      await authApi.updateProfile(token, {
        full_name: cleanName,
        school: cleanSchool,
        phone: cleanPhone ? `+233${cleanPhone}` : undefined,
      });
      await refreshUser();
      setMsg({ ok: true, text: 'Profile saved successfully!' });
    } catch (err: any) {
      setMsg({ ok: false, text: err.message ?? 'Failed to save. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const grad = avatarGradient(user.full_name);
  const inits = user.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-16">
      {/* Back */}
      <Link
        href="/account"
        className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight">Personal Info</h1>
        <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
          Update your name, phone, business, and profile
        </p>
      </div>

      {/* Avatar card */}
      <div className="border-[var(--color-border)]/80 shadow-xs flex items-center gap-5 rounded-3xl border bg-[var(--color-surface)] p-5 transition-all duration-300 hover:border-[var(--color-border)] hover:shadow-sm">
        <div className="group/avatar relative flex-shrink-0">
          <div
            className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md transition-transform duration-300 group-hover/avatar:scale-[1.03]`}
          >
            <span className="select-none text-xl font-medium text-white">{inits}</span>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/20" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate text-base font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
            {user.full_name}
          </p>
          <p className="truncate text-[11px] text-[var(--color-muted)]">{user.email}</p>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                user.role === 'SELLER'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400'
                  : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400'
              }`}
            >
              {user.role === 'SELLER' && <BadgeCheck className="h-3 w-3" />}
              {user.role === 'SELLER' ? 'Seller' : 'Buyer'}
            </span>
            {user.is_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:bg-amber-500/5 dark:text-amber-400">
                <MailWarning className="h-3 w-3" /> Email unverified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          {/* Full name */}
          <div>
            <FieldLabel>
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Full Name
              </span>
            </FieldLabel>
            <TextInput
              value={name}
              onChange={setName}
              placeholder="Your full name"
              maxLength={100}
            />
          </div>

          {/* Email — read-only */}
          <div>
            <FieldLabel>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </span>
            </FieldLabel>
            <TextInput value={user.email} disabled />
            <p className="mt-1.5 flex items-center gap-1 pl-1 text-[10px] text-[var(--color-muted)]">
              <Shield className="h-3 w-3 flex-shrink-0" />
              Email cannot be changed here. Contact support if needed.
            </p>
          </div>

          {/* Phone — Ghana +233 fixed prefix, leading 0 stripped live. */}
          <div>
            <FieldLabel>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </span>
            </FieldLabel>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5">
              <span className="text-xs font-medium text-[var(--color-muted)] select-none">
                +233
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => {
                  const v = e.target.value
                    .replace(/\D/g, '')
                    .replace(/^0+/, '');
                  setPhone(v);
                }}
                placeholder="244 123 456"
                maxLength={15}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1.5 flex items-center gap-1 pl-1 text-[10px] text-[var(--color-muted)]">
              <Shield className="h-3 w-3 flex-shrink-0" />
              Used for order alerts (Pro sellers) and security codes.
            </p>
          </div>

          {/* Business name (legacy DB column: `school`). */}
          <div>
            <FieldLabel>
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5" /> Business Name
              </span>
            </FieldLabel>
            <TextInput
              value={school}
              onChange={setSchool}
              placeholder="e.g. Ama's Boutique"
              maxLength={200}
            />
          </div>
        </div>

        {/* Alert */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                msg.ok
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                  : 'border-red-500/30 bg-red-500/10 text-red-600'
              }`}
            >
              {msg.ok ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-foreground)] text-sm font-medium uppercase tracking-wider text-[var(--color-background)] transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>

      {/* Quick links */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Quick Links
        </p>
        <div className="divide-[var(--color-border)]/50 divide-y overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Link
            href="/account/security"
            className="group flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[var(--color-background)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
                <Shield className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-[13px] font-normal">Change Password</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-foreground)]" />
          </Link>

          {user.role === 'USER' && user.approval_status !== 'APPROVED' && (
            <Link
              href="/seller-verification"
              className="group flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[var(--color-background)]"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[var(--color-accent)]/10 flex h-8 w-8 items-center justify-center rounded-xl">
                  <Star className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <span className="text-[13px] font-normal">Start selling</span>
                {user.approval_status === 'PENDING' && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-normal text-amber-500">
                    Pending
                  </span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-foreground)]" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
