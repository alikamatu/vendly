'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import PlatformAlert from '@/components/ui/Alert';
import {
  ArrowLeft,
  User,
  Mail,
  Building,
  Shield,
  Check,
  BadgeCheck,
  Calendar,
  ChevronRight,
  Star,
  Phone,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useAuth } from '@/lib/contexts/auth-context';
import { authApi } from '@/lib/api/auth';
import { sanitizeText } from '@/lib/utils/sanitize';
import { guardPhoneKeyDown, PHONE_DIGIT_LIMIT, sanitizeSubscriberNumber } from '@/lib/utils/phone';

// ─── Avatar ──────────────────────────────────────────────────────────────────

function getAvatarColor(name: string): string {
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Inline form field ────────────────────────────────────────────────────────

function Field({
  label,
  icon: Icon,
  children,
  hint,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-normal uppercase tracking-wider text-[var(--color-muted)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
      {hint && (
        <p className="flex items-center gap-1 pl-1 text-[10px] text-[var(--color-muted)]">
          <Shield className="h-3 w-3 flex-shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  type = 'text',
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={[
        'h-12 w-full rounded-2xl border border-[var(--color-border)] px-4',
        'bg-[var(--color-background)] text-base text-[var(--color-foreground)]',
        'placeholder:text-[var(--color-muted)]/50',
        'focus:ring-[var(--color-accent)]/15 outline-none focus:border-[var(--color-accent)] focus:ring-2',
        'transition-all duration-150',
        disabled ? 'cursor-not-allowed bg-[var(--color-surface)] opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

// ─── Pro features card ──────────────────────────────────────────────────────
// Shown to sellers in their profile so they can see what they unlock with
// Pro (active sellers get a "what you have" view; non-Pro get an upsell).
function ProFeaturesCard({ isPro }: { isPro: boolean }) {
  const features = [
    {
      icon: Star,
      title: 'Featured marketplace placement',
      desc: 'Get bumped to the top of category listings and into Featured Marketplace rotation.',
    },
    {
      icon: BarChart3,
      title: 'Advanced analytics',
      desc: 'Revenue trends, conversion, top sellers, and the buyer funnel.',
    },
    {
      icon: Sparkles,
      title: 'Branded share cards',
      desc: 'Portrait-mode product cards ready for Instagram and TikTok.',
    },
    {
      icon: Shield,
      title: 'Priority verification + support',
      desc: '24-hour verification SLA. Skip the queue, get WhatsApp help.',
    },
  ];
  return (
    <div
      className={`space-y-4 rounded-3xl border p-5 ${
        isPro ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`rounded-xl p-2 ${
              isPro ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Verndly Pro</p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {isPro ? 'Active on your account' : 'Upgrade to unlock'}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            isPro ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {isPro ? 'Active' : 'Pro'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="bg-[var(--color-background)]/60 flex items-start gap-3 rounded-2xl p-3"
            >
              <div
                className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
                  isPro ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--color-foreground)]">{f.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">
                  {f.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!isPro && (
        <Link href="/dashboard/settings" className="block">
          <Button className="h-11 w-full rounded-2xl bg-red-500 text-xs font-medium uppercase tracking-wider text-white hover:bg-red-600">
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade to Pro
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const { user, token, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    school: '',
    // Phone is stored as the local-format digits the user types (no +233,
    // no leading 0). We render +233 as a fixed prefix below.
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      // Convert the stored E.164 (+233244123456) back to local digits
      // for editing. If anything else is stored, fall back to raw.
      const stored = user.phone_e164 || '';
      const local = sanitizeSubscriberNumber(
        stored.startsWith('+233') ? stored.slice(4) : stored.replace(/^\+/, ''),
      );
      setFormData({
        full_name: user.full_name ?? '',
        school: user.school ?? '',
        phone: local,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const cleanName = sanitizeText(formData.full_name, 100).trim();
    const cleanSchool = sanitizeText(formData.school, 200).trim();
    const cleanPhone = formData.phone.replace(/\D/g, '').replace(/^0+/, '');

    if (cleanName.length < 2) {
      setMessage({ type: 'error', text: 'Full name must be at least 2 characters.' });
      return;
    }
    if (cleanPhone && cleanPhone.length < 7) {
      setMessage({
        type: 'error',
        text: 'Phone number looks too short. Use a Ghana number, e.g. 024 412 3456.',
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await authApi.updateProfile(token, {
        full_name: cleanName,
        school: cleanSchool,
        // Send the +233-prefixed form. Server re-normalises via
        // libphonenumber regardless, but this keeps the wire format
        // explicit.
        phone: cleanPhone ? `+233${cleanPhone}` : undefined,
      });
      await refreshUser();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message ?? 'Failed to update profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const initials = user.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const gradient = getAvatarColor(user.full_name);

  const joinedDate = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(new Date()); // fallback — API doesn't return created_at on /auth/me currently

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      {/* ── Back ── */}
      <Link
        href="/dashboard/settings"
        className="group inline-flex items-center gap-2 text-xs font-normal text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Settings
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight text-[var(--color-foreground)]">
          Personal Info
        </h1>
        <p className="mt-0.5 text-[11px] font-medium text-[var(--color-muted)]">
          Update your name, phone, business, and account details
        </p>
      </div>

      {/* ── Avatar + stats card ── */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="bg-primary flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm">
            <span className="text-xl font-medium text-white">{initials}</span>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="truncate text-base font-medium text-[var(--color-foreground)]">
                {user.full_name}
              </p>
              <p className="truncate text-[11px] text-[var(--color-muted)]">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Role badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  user.role === 'SELLER'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : user.role === 'ADMIN'
                      ? 'bg-violet-500/10 text-violet-600'
                      : 'bg-blue-500/10 text-blue-600'
                }`}
              >
                {user.role === 'SELLER' && <BadgeCheck className="h-3 w-3" />}
                {user.role === 'USER' ? 'Buyer' : user.role === 'SELLER' ? 'Seller' : 'Admin'}
              </span>

              {/* Verified badge */}
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-normal text-emerald-600">
                  <Check className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-normal text-amber-600">
                  <Mail className="h-3 w-3" /> Email unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <Field label="Full Name" icon={User}>
            <TextInput
              value={formData.full_name}
              onChange={(v) => setFormData((p) => ({ ...p, full_name: v }))}
              placeholder="Your full name"
              maxLength={100}
            />
          </Field>

          <Field
            label="Email Address"
            icon={Mail}
            hint="Email cannot be changed here for security. Contact support if needed."
          >
            <TextInput value={user.email} disabled />
          </Field>

          {/* Phone — Ghana +233 prefix is fixed; we strip the leading
              "0" as the user types so the editable portion is always
              the subscriber number. All sellers receive SMS order alerts
              and 2FA codes on this number. */}
          <Field
            label="Phone Number"
            icon={Phone}
            hint="Used for instant SMS order alerts and security codes."
          >
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5">
              <span className="select-none text-xs font-medium text-[var(--color-muted)]">
                +233
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, phone: sanitizeSubscriberNumber(e.target.value) }))
                }
                onKeyDown={(e) => guardPhoneKeyDown(e, PHONE_DIGIT_LIMIT - 1)}
                placeholder="244 123 456"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                maxLength={PHONE_DIGIT_LIMIT - 1}
              />
            </div>
          </Field>

          <Field
            label="Business Name"
            icon={Building}
            hint="Shown on receipts and your storefront."
          >
            <TextInput
              value={formData.school}
              onChange={(v) => setFormData((p) => ({ ...p, school: v }))}
              placeholder="e.g. Ama's Boutique"
              maxLength={200}
            />
          </Field>
        </div>

        <AnimatePresence>
          {message && <PlatformAlert variant={message.type} message={message.text} />}
        </AnimatePresence>

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Saving…"
          className="h-14 w-full rounded-2xl text-sm font-medium uppercase tracking-wider"
        >
          Save Changes
        </Button>
      </form>

      {/* ── Pro features card ── */}
      {user.role === 'SELLER' && <ProFeaturesCard isPro={!!user.is_pro} />}

      {/* ── Account danger zone ── */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Quick Links
        </p>
        <div className="divide-[var(--color-border)]/50 divide-y rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Link
            href="/dashboard/settings/security"
            className="group flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-[var(--color-background)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
                <Shield className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-sm font-normal text-[var(--color-foreground)]">
                Change Password
              </span>
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
                <div>
                  <span className="text-sm font-normal text-[var(--color-foreground)]">
                    Start selling
                  </span>
                  {user.approval_status === 'PENDING' && (
                    <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-normal text-amber-500">
                      Pending
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-foreground)]" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
