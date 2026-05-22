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
  CheckCircle2,
  MailWarning,
  Star,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/auth-context";
import { authApi } from "@/lib/api/auth";
import { sanitizeText } from "@/lib/utils/sanitize";

// ─── Gradient helper ──────────────────────────────────────────────────────────

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

// ─── Shared field components ──────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wider mb-1.5">
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
        "w-full h-12 px-4 rounded-2xl border border-[var(--color-border)]",
        "bg-[var(--color-background)] text-[var(--color-foreground)] text-base",
        "placeholder:text-[var(--color-muted)]/50",
        "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15",
        "transition-all duration-150",
        disabled ? "opacity-50 cursor-not-allowed bg-[var(--color-surface)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountProfilePage() {
  const { user, token, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.full_name ?? "");
      setSchool(user.school ?? "");
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const cleanName = sanitizeText(name, 100).trim();
    const cleanSchool = sanitizeText(school, 200).trim();

    if (cleanName.length < 2) {
      setMsg({ ok: false, text: "Full name must be at least 2 characters." });
      return;
    }

    setIsLoading(true);
    setMsg(null);

    try {
      await authApi.updateProfile(token, { full_name: cleanName, school: cleanSchool });
      await refreshUser();
      setMsg({ ok: true, text: "Profile saved successfully!" });
    } catch (err: any) {
      setMsg({ ok: false, text: err.message ?? "Failed to save. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const grad = avatarGradient(user.full_name);
  const inits = user.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-16">
      {/* Back */}
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] uppercase tracking-wider transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight">Personal Info</h1>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Update your name, school and profile</p>
      </div>

      {/* Avatar card */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 flex items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-lg`}>
          <span className="text-xl font-medium text-white select-none">{inits}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[15px] font-medium truncate">{user.full_name}</p>
          <p className="text-[11px] text-[var(--color-muted)] truncate">{user.email}</p>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
              user.role === "SELLER" ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
            }`}>
              {user.role === "SELLER" && <BadgeCheck className="w-3 h-3" />}
              {user.role === "SELLER" ? "Seller" : "Buyer"}
            </span>
            {user.is_verified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-normal bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-normal bg-amber-500/10 text-amber-600">
                <MailWarning className="w-3 h-3" /> Email unverified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 space-y-4">
          {/* Full name */}
          <div>
            <FieldLabel>
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</span>
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
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</span>
            </FieldLabel>
            <TextInput value={user.email} disabled />
            <p className="mt-1.5 text-[10px] text-[var(--color-muted)] flex items-center gap-1 pl-1">
              <Shield className="w-3 h-3 flex-shrink-0" />
              Email cannot be changed here. Contact support if needed.
            </p>
          </div>

          {/* School */}
          <div>
            <FieldLabel>
              <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> School / University</span>
            </FieldLabel>
            <TextInput
              value={school}
              onChange={setSchool}
              placeholder="e.g. University of Ghana"
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
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium ${
                msg.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                  : "bg-red-500/10 border-red-500/30 text-red-600"
              }`}
            >
              {msg.ok ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 rounded-2xl bg-[var(--color-foreground)] text-[var(--color-background)] font-medium uppercase tracking-wider text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>

      {/* Quick links */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wider">Quick Links</p>
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]/50 overflow-hidden">
          <Link
            href="/account/security"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-background)] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-[13px] font-normal">Change Password</span>
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
                <span className="text-[13px] font-normal">Start selling</span>
                {user.approval_status === "PENDING" && (
                  <span className="text-[10px] font-normal text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-foreground)] transition-colors" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
