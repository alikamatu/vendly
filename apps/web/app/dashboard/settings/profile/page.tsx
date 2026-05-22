"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  GraduationCap,
  Shield,
  Loader2,
  Check,
  AlertCircle,
  BadgeCheck,
  Calendar,
  ChevronRight,
  Star,
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
      <label className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const { user, token, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    full_name: "",
    school: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name ?? "",
        school: user.school ?? "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const cleanName = sanitizeText(formData.full_name, 100).trim();
    const cleanSchool = sanitizeText(formData.school, 200).trim();

    if (cleanName.length < 2) {
      setMessage({ type: "error", text: "Full name must be at least 2 characters." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await authApi.updateProfile(token, { full_name: cleanName, school: cleanSchool });
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
        className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Settings
      </Link>

      <div>
        <h1 className="text-lg font-black tracking-tight text-[var(--color-foreground)]">Personal Info</h1>
        <p className="text-[11px] text-[var(--color-muted)] font-medium mt-0.5">
          Update your name, school, and account details
        </p>
      </div>

      {/* ── Avatar + stats card ── */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <span className="text-xl font-black text-white">{initials}</span>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-base font-black text-[var(--color-foreground)] truncate">{user.full_name}</p>
              <p className="text-[11px] text-[var(--color-muted)] truncate">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Role badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                  <Check className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">
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

          <Field label="School / University" icon={GraduationCap}>
            <TextInput
              value={formData.school}
              onChange={(v) => setFormData((p) => ({ ...p, school: v }))}
              placeholder="e.g. University of Ghana"
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
          className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm"
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

      {/* ── Account danger zone ── */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-black text-[var(--color-muted)] uppercase tracking-widest">Quick Links</p>
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]/50">
          <Link
            href="/dashboard/settings/security"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-background)] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-sm font-bold text-[var(--color-foreground)]">Change Password</span>
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
                  <span className="text-sm font-bold text-[var(--color-foreground)]">Start selling</span>
                  {user.approval_status === "PENDING" && (
                    <span className="ml-2 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
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
