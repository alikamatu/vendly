"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import ProMembershipCard from "@/components/dashboard/ProMembershipCard";

// ─── Avatar ──────────────────────────────────────────────────────────────────

function getAvatarColor(name: string): string {
  const colors = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-amber-500",
    "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = getAvatarColor(name);
  const sizeClass = { sm: "w-9 h-9 text-sm", md: "w-14 h-14 text-lg", lg: "w-20 h-20 text-2xl" }[size];
  return (
    <div className={`${sizeClass} ${bg} rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0`}>
      {initials || "?"}
    </div>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

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
      className="flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-surface)] active:bg-[var(--color-border)]/30 transition-colors group"
    >
      <div className="flex items-center gap-3.5">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
          <item.icon className={`w-4 h-4 ${item.color}`} />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--color-foreground)] leading-tight">{item.name}</p>
          <p className="text-[11px] text-[var(--color-muted)] leading-tight mt-0.5">{item.desc}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-foreground)] transition-colors flex-shrink-0" />
    </Link>
  );
}

function SettingsGroup({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[10px] font-black text-[var(--color-muted)] uppercase tracking-widest">{title}</p>
      <div className="bg-[var(--color-surface)] rounded-3xl overflow-hidden border border-[var(--color-border)]">
        <div className="divide-y divide-[var(--color-border)]/50">
          {items.map((item) => (
            <SettingsRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: "USER" | "SELLER" | "ADMIN" }) {
  const map = {
    USER: { label: "Buyer", class: "bg-blue-500/10 text-blue-500" },
    SELLER: { label: "Seller", class: "bg-emerald-500/10 text-emerald-500" },
    ADMIN: { label: "Admin", class: "bg-violet-500/10 text-violet-500" },
  };
  const { label, class: cls } = map[role];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${cls}`}>
      {role === "SELLER" && <BadgeCheck className="w-3 h-3" />}
      {label}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
      <CheckCircle2 className="w-3 h-3" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">
      <MailWarning className="w-3 h-3" /> Email not verified
    </span>
  );
}

// ─── Approval status card (for USER role) ────────────────────────────────────

function SellerCTA({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | null }) {
  if (status === "APPROVED") return null;

  const config = {
    PENDING: {
      icon: Clock,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      badge: "bg-amber-500/10 text-amber-600",
      badgeText: "Under Review",
      title: "Verification in progress",
      body: "Our team is reviewing your application. This usually takes 24–48 hours. You'll be notified once approved.",
      cta: null,
    },
    REJECTED: {
      icon: XCircle,
      iconBg: "bg-red-500/10",
      iconColor: "text-red-500",
      badge: "bg-red-500/10 text-red-600",
      badgeText: "Not Approved",
      title: "Verification not approved",
      body: "Your previous request was rejected. Please review our seller policies and resubmit with valid documentation.",
      cta: { label: "Reapply now", href: "/seller-verification" },
    },
    null: {
      icon: Store,
      iconBg: "bg-[var(--color-accent)]/10",
      iconColor: "text-[var(--color-accent)]",
      badge: null,
      badgeText: null,
      title: "Open your storefront",
      body: "List products, accept payments, ship to customers nationwide. Built for young entrepreneurs and growing businesses.",
      cta: { label: "Get started", href: "/seller-verification" },
    },
  };

  const c = config[status as keyof typeof config];
  const Icon = c.icon;

  return (
    <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
          <Icon className={`w-5 h-5 ${c.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-[var(--color-foreground)]">{c.title}</p>
            {c.badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                {c.badgeText}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">{c.body}</p>
        </div>
      </div>
      {c.cta && (
        <Link
          href={c.cta.href}
          className="flex items-center justify-center w-full h-11 rounded-2xl bg-[var(--color-accent)] text-white text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {c.cta.label}
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isSeller = user.role === "SELLER";

  // ── Settings groups ──────────────────────────────────────────────────────────

  const storeGroup: SettingItem[] = [
    { id: "store", name: "Store Information", desc: "Branding, location, hours", icon: Store, href: "/dashboard/settings/store", color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  const accountGroup: SettingItem[] = [
    { id: "profile", name: "Personal Info", desc: "Name, email, school", icon: User, href: "/dashboard/settings/profile", color: "text-violet-500", bg: "bg-violet-500/10" },
    { id: "security", name: "Password & Security", desc: "Change password, 2FA", icon: ShieldCheck, href: "/dashboard/settings/security", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const shoppingGroup: SettingItem[] = [
    { id: "orders", name: "My Orders", desc: "Track your purchases", icon: Package, href: "/orders", color: "text-orange-500", bg: "bg-orange-500/10" },
    { id: "favorites", name: "Saved Items", desc: "Products you've liked", icon: Heart, href: "/favorites", color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  const preferencesGroup: SettingItem[] = [
    { id: "personalization", name: "Appearance", desc: "Dark mode, display options", icon: Palette, href: "/dashboard/settings/personalization", color: "text-pink-500", bg: "bg-pink-500/10" },
  ];

  const legalGroup: SettingItem[] = [
    { id: "terms", name: "Terms & Conditions", desc: "Seller agreement, policies", icon: FileText, href: "/dashboard/settings/terms", color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const supportGroup: SettingItem[] = [
    { id: "help", name: "Help & Support", desc: "FAQ, contact us, report a problem", icon: HelpCircle, href: "/dashboard/settings/help", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-10">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-lg font-black tracking-tight text-[var(--color-foreground)]">Settings</h1>
        <p className="text-[11px] text-[var(--color-muted)] font-medium mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      {/* ── Profile card ── */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4 flex items-center gap-4">
        <Avatar name={user.full_name} size="md" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-base font-black text-[var(--color-foreground)] truncate">{user.full_name}</p>
          <p className="text-[11px] text-[var(--color-muted)] truncate">{user.email}</p>
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <RoleBadge role={user.role} />
            <VerifiedBadge verified={user.is_verified} />
          </div>
        </div>
        <Link
          href="/dashboard/settings/profile"
          className="flex-shrink-0 px-3 h-8 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-all flex items-center"
        >
          Edit
        </Link>
      </div>

      {/* ── Become a Seller CTA (USER only) ── */}
      {user.role === "USER" && (
        <SellerCTA status={user.approval_status} />
      )}

      {/* ── Pro membership ── */}
      {(isSeller || user.role === "ADMIN") && <ProMembershipCard />}

      {/* ── Seller store group ── */}
      {isSeller && (
        <SettingsGroup title="Store" items={storeGroup} />
      )}

      {/* ── Account ── */}
      <SettingsGroup title="Account" items={accountGroup} />

      {/* ── Shopping ── */}
      <SettingsGroup title="Shopping" items={shoppingGroup} />

      {/* ── Preferences ── */}
      <SettingsGroup title="Preferences" items={preferencesGroup} />

      {/* ── Legal ── */}
      <SettingsGroup title="Legal" items={legalGroup} />

      {/* ── Support ── */}
      <SettingsGroup title="Support" items={supportGroup} />

      {/* ── Sign out ── */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 text-red-500 hover:bg-red-500/5 active:bg-red-500/10 transition-colors"
        >
          <div className="w-9 h-9 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-500 leading-tight">Sign Out</p>
            <p className="text-[11px] text-red-400 leading-tight mt-0.5">Log out of your account</p>
          </div>
        </button>
      </div>

      <p className="text-center text-[10px] text-[var(--color-muted)] pb-2">
        Vendly · v1.0 · Made with ♥ for young entrepreneurs
      </p>
    </div>
  );
}
