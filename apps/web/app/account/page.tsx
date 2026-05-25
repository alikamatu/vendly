'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Palette,
  Package,
  Heart,
  HelpCircle,
  FileText,
  ChevronRight,
  LogOut,
  Star,
  Clock,
  XCircle,
  BadgeCheck,
  CheckCircle2,
  MailWarning,
  LayoutDashboard,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

// ─── Avatar helpers ───────────────────────────────────────────────────────────

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

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </p>
      <div className="border-[var(--color-border)]/80 divide-[var(--color-border)]/40 shadow-xs divide-y overflow-hidden rounded-3xl border bg-[var(--color-surface)] transition-all duration-300 hover:border-[var(--color-border)] hover:shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Row({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  label,
  sublabel,
  badge,
  external,
}: {
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  badge?: React.ReactNode;
  external?: boolean;
}) {
  const inner = (
    <div className="active:bg-[var(--color-border)]/10 group flex cursor-pointer items-center justify-between px-5 py-4 transition-all duration-300 hover:bg-[var(--color-background)]">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${iconBg}`}
        >
          <Icon
            className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${iconColor}`}
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-medium leading-tight text-[var(--color-foreground)] transition-colors duration-200 group-hover:text-[var(--color-accent)]">
              {label}
            </p>
            {badge}
          </div>
          {sublabel && (
            <p className="mt-1 truncate text-[11px] leading-tight text-[var(--color-muted)]">
              {sublabel}
            </p>
          )}
        </div>
      </div>
      <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-[var(--color-muted)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--color-foreground)]" />
    </div>
  );

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link href={href}>{inner}</Link>
  );
}

// ─── Seller CTA ───────────────────────────────────────────────────────────────

function SellerCTA({ status }: { status: 'PENDING' | 'APPROVED' | 'REJECTED' | null }) {
  if (status === 'APPROVED') return null;

  if (status === 'PENDING') {
    return (
      <div className="bg-amber-500/8 flex items-start gap-3 rounded-3xl border border-amber-400/30 p-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
          <Clock className="h-5 w-5 text-amber-500" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              Verification in review
            </p>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-normal text-amber-600">
              Under Review
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
            Our team is reviewing your application. Usually takes 24–48 hours.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div className="bg-red-500/8 space-y-3 rounded-3xl border border-red-400/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/15">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              Verification not approved
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
              Review our seller policies and resubmit with valid documentation.
            </p>
          </div>
        </div>
        <Link
          href="/seller-verification"
          className="flex h-11 items-center justify-center rounded-2xl bg-red-500 text-xs font-medium uppercase tracking-wider text-white transition-all hover:bg-red-600 active:scale-[0.98]"
        >
          Reapply
        </Link>
      </div>
    );
  }

  // null — not started
  return (
    <div className="border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 space-y-3 rounded-3xl border p-4">
      <div className="flex items-start gap-3">
        <div className="bg-[var(--color-accent)]/15 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl">
          <Star className="h-5 w-5 text-[var(--color-accent)]" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Start selling on Vendly
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
            Join young entrepreneurs, list products and grow your business — all in one place.
          </p>
        </div>
      </div>
      <Link
        href="/seller-verification"
        className="flex h-11 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-xs font-medium uppercase tracking-wider text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        Start selling
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/register?mode=login&next=/account');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto flex max-w-lg items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  const isSeller = user.role === 'SELLER';
  const grad = avatarGradient(user.full_name);

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-16">
      {/* ── Profile card ── */}
      <div className="border-[var(--color-border)]/80 shadow-xs rounded-3xl border bg-[var(--color-surface)] p-5 transition-all duration-300 hover:border-[var(--color-border)] hover:shadow-sm">
        <div className="flex items-center gap-5">
          {/* Avatar with beautiful outline ring */}
          <div className="group/avatar relative">
            <div
              className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${grad} flex flex-shrink-0 items-center justify-center shadow-md transition-transform duration-300 group-hover/avatar:scale-[1.03]`}
            >
              <span className="select-none text-xl font-medium text-white">
                {initials(user.full_name)}
              </span>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/20" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-tight tracking-tight text-[var(--color-foreground)]">
              {user.full_name}
            </p>
            <p className="mt-1 truncate text-[11px] text-[var(--color-muted)]">{user.email}</p>
            {user.school && (
              <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted)]">{user.school}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {/* Role */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  isSeller
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400'
                    : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400'
                }`}
              >
                {isSeller && <BadgeCheck className="h-3 w-3" />}
                {isSeller ? 'Seller' : 'Buyer'}
              </span>
              {/* Verified */}
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:bg-amber-500/5 dark:text-amber-400">
                  <MailWarning className="h-3 w-3" /> Unverified
                </span>
              )}
            </div>
          </div>

          <Link
            href="/account/profile"
            className="hover:bg-[var(--color-accent)]/5 flex h-9 flex-shrink-0 items-center whitespace-nowrap rounded-xl border border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-muted)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] active:scale-95"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* ── Become a Seller CTA (buyers only) ── */}
      {user.role === 'USER' && <SellerCTA status={user.approval_status} />}

      {/* ── Seller shortcut ── */}
      {isSeller && (
        <Group label="Store">
          <Row
            href="/dashboard"
            icon={LayoutDashboard}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-500"
            label="Seller Dashboard"
            sublabel="Products, orders, payouts"
          />
        </Group>
      )}

      {/* ── Account ── */}
      <Group label="Account">
        <Row
          href="/account/profile"
          icon={User}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          label="Personal Info"
          sublabel="Name, school, email"
        />
        <Row
          href="/account/security"
          icon={ShieldCheck}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          label="Password & Security"
          sublabel="Change your password"
        />
        <Row
          href="/account/addresses"
          icon={MapPin}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          label="Address Book"
          sublabel="Manage delivery addresses"
        />
      </Group>

      {/* ── Activity ── */}
      <Group label="My Activity">
        <Row
          href="/orders"
          icon={Package}
          iconBg="bg-orange-500/10"
          iconColor="text-orange-500"
          label="My Orders"
          sublabel="Track purchases and delivery"
        />
        <Row
          href="/favorites"
          icon={Heart}
          iconBg="bg-rose-500/10"
          iconColor="text-rose-500"
          label="Saved Items"
          sublabel="Products you've liked"
        />
      </Group>

      {/* ── Preferences ── */}
      <Group label="Preferences">
        <Row
          href="/account/appearance"
          icon={Palette}
          iconBg="bg-pink-500/10"
          iconColor="text-pink-500"
          label="Appearance"
          sublabel="Dark mode, display options"
        />
      </Group>

      {/* ── Legal ── */}
      <Group label="Legal & Privacy">
        <Row
          href="/account/terms"
          icon={FileText}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          label="Terms & Conditions"
          sublabel="User agreement and policies"
        />
        <Row
          href="/account/data"
          icon={ShieldAlert}
          iconBg="bg-red-500/10"
          iconColor="text-red-500"
          label="Data & Privacy"
          sublabel="Export data, delete account"
        />
      </Group>

      {/* ── Support ── */}
      <Group label="Support">
        <Row
          href="/account/help"
          icon={HelpCircle}
          iconBg="bg-cyan-500/10"
          iconColor="text-cyan-500"
          label="Help & Support"
          sublabel="FAQ, contact us, report an issue"
        />
      </Group>

      {/* ── Sign out ── */}
      <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3.5 px-4 py-3.5 text-red-500 transition-colors hover:bg-red-500/5 active:bg-red-500/10"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/10">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-normal leading-tight text-red-500">Sign Out</p>
            <p className="mt-0.5 text-[11px] leading-tight text-red-400">Log out of your account</p>
          </div>
        </button>
      </div>
    </div>
  );
}
