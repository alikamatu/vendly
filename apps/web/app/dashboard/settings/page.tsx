'use client';

import Link from 'next/link';
import {
  Store,
  User,
  Palette,
  ShieldCheck,
  FileText,
  ChevronRight,
  LogOut,
  Package,
  Heart,
  HelpCircle,
  Star,
  CheckCircle2,
  Clock,
  XCircle,
  BadgeCheck,
  MailWarning,
  MapPin,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import ProMembershipCard from '@/components/dashboard/ProMembershipCard';

function getAvatarColor(name: string): string {
  const colors = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-amber-500',
    'bg-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const bg = getAvatarColor(name);
  const sizeClass = { sm: 'w-9 h-9 text-sm', md: 'w-14 h-14 text-lg', lg: 'w-20 h-20 text-2xl' }[
    size
  ];
  return (
    <div
      className={`${sizeClass} ${bg} flex flex-shrink-0 items-center justify-center rounded-2xl font-medium text-white`}
    >
      {initials || '?'}
    </div>
  );
}

interface SettingItem {
  id: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bg: string;
  external?: boolean;
}

function SettingsRow({ item }: { item: SettingItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center justify-between rounded-2xl px-3.5 py-3 transition-colors hover:bg-[var(--color-background)]"
    >
      <div className="flex items-center gap-3.5">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${item.bg}`}
        >
          <item.icon className={`h-4 w-4 ${item.color}`} />
        </div>
        <div>
          <p className="text-sm font-normal leading-tight text-[var(--color-foreground)]">
            {item.name}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-[var(--color-muted)]">{item.desc}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-foreground)]" />
    </Link>
  );
}

function SettingsGroup({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs font-semibold text-[var(--color-muted)]">{title}</p>
      <div className="space-y-1 overflow-hidden rounded-3xl bg-[var(--color-surface)] p-1.5">
        {items.map((item) => (
          <SettingsRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: 'USER' | 'SELLER' | 'ADMIN' }) {
  const map = {
    USER: { label: 'Buyer', class: 'bg-blue-500/10 text-blue-500' },
    SELLER: { label: 'Seller', class: 'bg-emerald-500/10 text-emerald-500' },
    ADMIN: { label: 'Admin', class: 'bg-violet-500/10 text-violet-500' },
  };
  const { label, class: cls } = map[role];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {role === 'SELLER' && <BadgeCheck className="h-3 w-3" />}
      {label}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-normal text-emerald-600">
      <CheckCircle2 className="h-3 w-3" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-normal text-amber-600">
      <MailWarning className="h-3 w-3" /> Email not verified
    </span>
  );
}

function SellerCTA({ status }: { status: 'PENDING' | 'APPROVED' | 'REJECTED' | null }) {
  if (status === 'APPROVED') return null;

  const config = {
    PENDING: {
      icon: Clock,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      badge: 'bg-amber-500/10 text-amber-600',
      badgeText: 'Under Review',
      title: 'Verification in progress',
      body: "Our team is reviewing your application. This usually takes 24–48 hours. You'll be notified once approved.",
      cta: null,
    },
    REJECTED: {
      icon: XCircle,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      badge: 'bg-red-500/10 text-red-600',
      badgeText: 'Not Approved',
      title: 'Verification not approved',
      body: 'Your previous request was rejected. Please review our seller policies and resubmit with valid documentation.',
      cta: { label: 'Reapply now', href: '/seller-verification' },
    },
    null: {
      icon: Store,
      iconBg: 'bg-[var(--color-accent)]/10',
      iconColor: 'text-[var(--color-accent)]',
      badge: null,
      badgeText: null,
      title: 'Open your storefront',
      body: 'List products, accept payments, ship to customers nationwide. Built for young entrepreneurs and growing businesses.',
      cta: { label: 'Get started', href: '/seller-verification' },
    },
  };

  const c = config[status as keyof typeof config];
  const Icon = c.icon;

  return (
    <div className="space-y-3 rounded-3xl bg-[var(--color-surface)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${c.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${c.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-foreground)]">{c.title}</p>
            {c.badge && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-normal ${c.badge}`}>
                {c.badgeText}
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">{c.body}</p>
        </div>
      </div>
      {c.cta && (
        <Link
          href={c.cta.href}
          className="flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--color-accent)] text-xs font-medium uppercase tracking-wider text-white transition-all hover:opacity-90 active:scale-[0.98]"
        >
          {c.cta.label}
        </Link>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isSeller = user.role === 'SELLER';

  const storeGroup: SettingItem[] = [
    {
      id: 'store',
      name: 'Store Information',
      desc: 'Branding, location, hours',
      icon: Store,
      href: '/dashboard/settings/store',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  const accountGroup: SettingItem[] = [
    {
      id: 'profile',
      name: 'Personal Info',
      desc: 'Name, email, phone, business',
      icon: User,
      href: '/dashboard/settings/profile',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
    {
      id: 'security',
      name: 'Password & Security',
      desc: 'Change password, 2FA',
      icon: ShieldCheck,
      href: '/dashboard/settings/security',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      id: 'activity',
      name: 'Activity & Audit Log',
      desc: 'Security events, changes & history',
      icon: Activity,
      href: '/dashboard/settings/activity',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  const shoppingGroup: SettingItem[] = [
    {
      id: 'orders',
      name: 'Store Orders',
      desc: 'Manage fulfillment and customer orders',
      icon: Package,
      href: '/dashboard/orders',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      id: 'reviews',
      name: 'Store Reviews',
      desc: 'Customer feedback and ratings',
      icon: Star,
      href: '/dashboard/reviews',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ];

  const preferencesGroup: SettingItem[] = [
    {
      id: 'personalization',
      name: 'Appearance',
      desc: 'Dark mode, display options',
      icon: Palette,
      href: '/dashboard/settings/personalization',
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
    },
  ];

  const legalGroup: SettingItem[] = [
    {
      id: 'terms',
      name: 'Terms & Conditions',
      desc: 'Seller agreement, policies',
      icon: FileText,
      href: '/dashboard/settings/terms',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ];

  const supportGroup: SettingItem[] = [
    {
      id: 'help',
      name: 'Help & Support',
      desc: 'FAQ, contact us, report a problem',
      icon: HelpCircle,
      href: '/dashboard/settings/help',
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="w-full max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
          Settings
        </h1>
        <p className="mt-0.5 text-xs text-[var(--color-muted)] sm:text-sm">
          Manage your store, account, and preferences
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-3xl bg-[var(--color-surface)] p-4 sm:p-5">
        <Avatar name={user.full_name} size="md" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-base font-medium text-[var(--color-foreground)]">
            {user.full_name}
          </p>
          <p className="truncate text-xs text-[var(--color-muted)]">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <RoleBadge role={user.role} />
            <VerifiedBadge verified={user.is_verified} />
          </div>
        </div>
        <Link
          href="/dashboard/settings/profile"
          className="flex h-9 flex-shrink-0 items-center rounded-xl bg-[var(--color-background)] px-3.5 text-xs font-medium text-[var(--color-foreground)] transition-opacity hover:opacity-80"
        >
          Edit
        </Link>
      </div>

      {user.role === 'USER' && <SellerCTA status={user.approval_status} />}

      {(isSeller || user.role === 'ADMIN') && <ProMembershipCard />}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {isSeller && <SettingsGroup title="Store" items={storeGroup} />}

        <SettingsGroup title="Account" items={accountGroup} />

        <SettingsGroup title="Shopping" items={shoppingGroup} />

        <SettingsGroup title="Preferences" items={preferencesGroup} />

        <SettingsGroup title="Legal & Privacy" items={legalGroup} />

        <SettingsGroup title="Support" items={supportGroup} />
      </div>

      <div className="overflow-hidden rounded-3xl bg-[var(--color-surface)]">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3.5 px-4 py-3.5 text-red-500 transition-colors hover:bg-red-500/5 active:bg-red-500/10"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/10">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-normal leading-tight text-red-500">Sign Out</p>
            <p className="mt-0.5 text-[11px] leading-tight text-red-400">Log out of your account</p>
          </div>
        </button>
      </div>

      <p className="pb-2 text-center text-[10px] text-[var(--color-muted)]">
        Verndly · v1.0 · Made with ♥ for young entrepreneurs
      </p>
    </div>
  );
}
