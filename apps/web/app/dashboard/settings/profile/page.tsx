"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Building,
  Shield,
  Loader2,
  Check,
  AlertCircle,
  BadgeCheck,
  Calendar,
  ChevronRight,
  Star,
  Phone,
  Sparkles,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/contexts/auth-context";
import { authApi } from "@/lib/api/auth";
import { sanitizeText } from "@/lib/utils/sanitize";

// ─── Avatar ──────────────────────────────────────────────────────────────────

function getAvatarColor(name: string): string {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-blue-600",
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
      <label className="flex items-center gap-1.5 text-[11px] font-normal text-[var(--color-muted)] uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-[var(--color-muted)] pl-1 flex items-center gap-1">
          <Shield className="w-3 h-3 flex-shrink-0" />
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
  type = "text",
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
        "w-full h-12 px-4 rounded-2xl border border-[var(--color-border)]",
        "bg-[var(--color-background)] text-[var(--color-foreground)] text-base",
        "placeholder:text-[var(--color-muted)]/50",
        "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15",
        "transition-all duration-150",
        disabled
          ? "opacity-50 cursor-not-allowed bg-[var(--color-surface)]"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

// ─── Alert ───────────────────────────────────────────────────────────────────

function Alert({ type, text }: { type: "success" | "error"; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium ${
        type === "success"
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
          : "bg-red-500/10 border-red-500/30 text-red-600"
      }`}
    >
      {type === "success" ? (
        <Check className="w-4 h-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {text}
    </motion.div>
  );
}

// ─── Pro features card ──────────────────────────────────────────────────────
// Shown to sellers in their profile so they can see what they unlock with
// Pro (active sellers get a "what you have" view; non-Pro get an upsell).
// The SMS-on-order perk is the one most sellers ask about, so it leads.
function ProFeaturesCard({ isPro }: { isPro: boolean }) {
  const features = [
    {
      icon: MessageSquare,
      title: "SMS order alerts",
      desc: "Get a text the moment a buyer pays — no missed sales while you're off-app.",
    },
    {
      icon: BarChart3,
      title: "Advanced analytics",
      desc: "Revenue trends, conversion, top sellers, and the buyer funnel.",
    },
    {
      icon: Sparkles,
      title: "Branded share cards",
      desc: "Portrait-mode product cards ready for Instagram and TikTok.",
    },
    {
      icon: Shield,
      title: "Priority verification + support",
      desc: "24-hour verification SLA. Skip the queue, get WhatsApp help.",
    },
  ];
  return (
    <div
      className={`rounded-3xl border p-5 space-y-4 ${
        isPro
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`rounded-xl p-2 ${
              isPro
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              Vendly Pro
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {isPro ? "Active on your account" : "Upgrade to unlock"}
            </p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            isPro
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {isPro ? "Active" : "Pro"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-2xl bg-[var(--color-background)]/60 p-3"
            >
              <div
                className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
                  isPro
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-red-500/10 text-red-500"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--color-foreground)]">
                  {f.title}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] leading-snug mt-0.5">
                  {f.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!isPro && (
        <Link href="/dashboard/settings" className="block">
          <Button className="w-full h-11 rounded-2xl font-medium text-xs uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white">
            <Sparkles className="w-3.5 h-3.5" />
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
    full_name: "",
    school: "",
    // Phone is stored as the local-format digits the user types (no +233,
    // no leading 0). We render +233 as a fixed prefix below.
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      // Convert the stored E.164 (+233244123456) back to local digits
      // for editing. If anything else is stored, fall back to raw.
      const stored = user.phone_e164 || "";
      const local = stored.startsWith("+233") ? stored.slice(4) : stored.replace(/^\+/, "");
      setFormData({
        full_name: user.full_name ?? "",
        school: user.school ?? "",
        phone: local,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const cleanName = sanitizeText(formData.full_name, 100).trim();
    const cleanSchool = sanitizeText(formData.school, 200).trim();
    const cleanPhone = formData.phone.replace(/\D/g, "").replace(/^0+/, "");

    if (cleanName.length < 2) {
      setMessage({ type: "error", text: "Full name must be at least 2 characters." });
      return;
    }
    if (cleanPhone && cleanPhone.length < 7) {
      setMessage({
        type: "error",
        text: "Phone number looks too short. Use a Ghana number, e.g. 024 412 3456.",
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
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message ?? "Failed to update profile." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const gradient = getAvatarColor(user.full_name);

  const joinedDate = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date()); // fallback — API doesn't return created_at on /auth/me currently

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-10">
      {/* ── Back ── */}
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 text-xs font-normal text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Settings
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight text-[var(--color-foreground)]">Personal Info</h1>
        <p className="text-[11px] text-[var(--color-muted)] font-medium mt-0.5">
          Update your name, phone, business, and account details
        </p>
      </div>

      {/* ── Avatar + stats card ── */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <span className="text-xl font-medium text-white">{initials}</span>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-base font-medium text-[var(--color-foreground)] truncate">{user.full_name}</p>
              <p className="text-[11px] text-[var(--color-muted)] truncate">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Role badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                  user.role === "SELLER"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : user.role === "ADMIN"
                      ? "bg-violet-500/10 text-violet-600"
                      : "bg-blue-500/10 text-blue-600"
                }`}
              >
                {user.role === "SELLER" && <BadgeCheck className="w-3 h-3" />}
                {user.role === "USER" ? "Buyer" : user.role === "SELLER" ? "Seller" : "Admin"}
              </span>

              {/* Verified badge */}
              {user.is_verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-normal bg-emerald-500/10 text-emerald-600">
                  <Check className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-normal bg-amber-500/10 text-amber-600">
                  <Mail className="w-3 h-3" /> Email unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 space-y-4">
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
              the subscriber number. Sellers need this to receive SMS
              order alerts (Pro perk) and 2FA codes. */}
          <Field
            label="Phone Number"
            icon={Phone}
            hint="Used for order alerts (Pro sellers) and security codes."
          >
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5">
              <span className="text-xs font-medium text-[var(--color-muted)] select-none">
                +233
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={formData.phone}
                onChange={(e) => {
                  const v = e.target.value
                    .replace(/\D/g, "")
                    .replace(/^0+/, "");
                  setFormData((p) => ({ ...p, phone: v }));
                }}
                placeholder="244 123 456"
                className="flex-1 bg-transparent text-sm focus:outline-none"
                maxLength={15}
              />
            </div>
          </Field>

          <Field label="Business Name" icon={Building} hint="Shown on receipts and your storefront.">
            <TextInput
              value={formData.school}
              onChange={(v) => setFormData((p) => ({ ...p, school: v }))}
              placeholder="e.g. Ama's Boutique"
              maxLength={200}
            />
          </Field>
        </div>

        <AnimatePresence>
          {message && <Alert type={message.type} text={message.text} />}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 rounded-2xl font-medium uppercase tracking-wider text-sm"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving…
            </span>
          ) : (
            "Save Changes"
          )}
        </Button>
      </form>

      {/* ── Pro features card ── */}
      {user.role === "SELLER" && <ProFeaturesCard isPro={!!user.is_pro} />}

      {/* ── Account danger zone ── */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wider">Quick Links</p>
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]/50">
          <Link
            href="/dashboard/settings/security"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-background)] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-sm font-normal text-[var(--color-foreground)]">Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-foreground)] transition-colors" />
          </Link>

          {user.role === "USER" && user.approval_status !== "APPROVED" && (
            <Link
              href="/seller-verification"
              className="flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-background)] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
                <div>
                  <span className="text-sm font-normal text-[var(--color-foreground)]">Start selling</span>
                  {user.approval_status === "PENDING" && (
                    <span className="ml-2 text-[10px] font-normal text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-foreground)] transition-colors" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
