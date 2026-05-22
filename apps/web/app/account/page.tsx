"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-500",
  "from-indigo-500 to-violet-600",
  "from-amber-500 to-orange-600",
];

function avatarGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 text-[10px] font-black text-[var(--color-muted)] uppercase tracking-widest">
        {label}
      </p>
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]/50">
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
    <div className="flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-background)] active:bg-[var(--color-border)]/20 transition-colors group cursor-pointer">
      <div className="flex items-center gap-3.5">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-[var(--color-foreground)] leading-tight">
              {label}
            </p>
            {badge}
          </div>
          {sublabel && (
            <p className="text-[11px] text-[var(--color-muted)] leading-tight mt-0.5 truncate">
              {sublabel}
            </p>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-foreground)] transition-colors flex-shrink-0 ml-2" />
    </div>
  );

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
  ) : (
    <Link href={href}>{inner}</Link>
  );
}

// ─── Seller CTA ───────────────────────────────────────────────────────────────

function SellerCTA({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | null }) {
  if (status === "APPROVED") return null;

  if (status === "PENDING") {
    return (
      <div className="rounded-3xl border border-amber-400/30 bg-amber-500/8 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-[var(--color-foreground)]">Verification in review</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">
              Under Review
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            Our team is reviewing your application. Usually takes 24–48 hours.
          </p>
        </div>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="rounded-3xl border border-red-400/30 bg-red-500/8 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-black text-[var(--color-foreground)]">Verification not approved</p>
            <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
              Review our seller policies and resubmit with valid documentation.
            </p>
          </div>
        </div>
        <Link
          href="/seller-verification"
          className="flex items-center justify-center h-11 rounded-2xl bg-red-500 text-white text-xs font-black uppercase tracking-widest hover:bg-red-600 active:scale-[0.98] transition-all"
        >
          Reapply
        </Link>
      </div>
    );
  }

  // null — not started
  return (
    <div className="rounded-3xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0">
          <Star className="w-5 h-5 text-[var(--color-accent)]" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-black text-[var(--color-foreground)]">Start selling on Vendly</p>
          <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
            Join young entrepreneurs, list products and grow your business — all in one place.
          </p>
        </div>
      </div>
      <Link
        href="/seller-verification"
        className="flex items-center justify-center h-11 rounded-2xl bg-[var(--color-accent)] text-white text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all"
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
      router.replace("/register?mode=login&next=/account");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="max-w-lg mx-auto py-16 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const isSeller = user.role === "SELLER";
  const grad = avatarGradient(user.full_name);

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-16">

      {/* ── Profile card ── */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <span className="text-xl font-black text-white select-none">
              {initials(user.full_name)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-black text-[var(--color-foreground)] truncate leading-tight">
              {user.full_name}
            </p>
            <p className="text-[11px] text-[var(--color-muted)] truncate mt-0.5">{user.email}</p>
            {user.school && (
              <p className="text-[10px] text-[var(--color-muted)] truncate">{user.school}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              {/* Role */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${isSeller ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
                }`}>
                {isSeller && <BadgeCheck className="w-3 h-3" />}
                {isSeller ? "Seller" : "Buyer"}
              </span>
              {/* Verified */}
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">
                  <MailWarning className="w-3 h-3" /> Unverified
                </span>
              )}
            </div>
          </div>

          <Link
            href="/account/profile"
            className="flex-shrink-0 px-3 h-8 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-muted)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-all flex items-center whitespace-nowrap"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* ── Become a Seller CTA (buyers only) ── */}
      {user.role === "USER" && (
        <SellerCTA status={user.approval_status} />
      )}

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
      <Group label="Legal">
        <Row
          href="/account/terms"
          icon={FileText}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          label="Terms & Conditions"
          sublabel="User agreement and policies"
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
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] overflow-hidden">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 text-red-500 hover:bg-red-500/5 active:bg-red-500/10 transition-colors"
        >
          <div className="w-9 h-9 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-red-500 leading-tight">Sign Out</p>
            <p className="text-[11px] text-red-400 leading-tight mt-0.5">Log out of your account</p>
          </div>
        </button>
      </div>
    </div>
  );
}
