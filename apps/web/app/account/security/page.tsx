"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertCircle,
  ShieldCheck,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/auth-context";
import { authApi } from "@/lib/api/auth";

// ─── Strength meter ───────────────────────────────────────────────────────────

function strength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too short", color: "bg-red-400" },
    1: { label: "Weak", color: "bg-red-400" },
    2: { label: "Fair", color: "bg-amber-400" },
    3: { label: "Good", color: "bg-yellow-400" },
    4: { label: "Strong", color: "bg-emerald-400" },
    5: { label: "Very strong", color: "bg-emerald-500" },
  };
  return { score: s, ...map[Math.min(s, 5)] };
}

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = strength(password);
  return (
    <div className="space-y-1 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? color : "bg-[var(--color-border)]"
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] font-bold text-[var(--color-muted)] pl-0.5">{label}</p>
    </div>
  );
}

// ─── Password field ───────────────────────────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-[11px] font-black text-[var(--color-muted)] uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          required={required}
          autoComplete="new-password"
          className={[
            "w-full h-12 px-4 pr-12 rounded-2xl border border-[var(--color-border)]",
            "bg-[var(--color-background)] text-[var(--color-foreground)] text-base",
            "outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15",
            "transition-all duration-150",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountSecurityPage() {
  const { token } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { score } = strength(next);
  const mismatch = confirm.length > 0 && next !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (next !== confirm) {
      setMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    if (score < 2) {
      setMsg({ ok: false, text: "Choose a stronger password (min 8 chars, mix letters & numbers)." });
      return;
    }

    setIsLoading(true);
    setMsg(null);

    try {
      await authApi.updateProfile(token, {
        current_password: current,
        new_password: next,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg({ ok: true, text: "Password updated successfully!" });
    } catch (err: any) {
      setMsg({ ok: false, text: err.message ?? "Failed to update password." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-16">
      {/* Back */}
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-[11px] font-black text-[var(--color-muted)] hover:text-[var(--color-foreground)] uppercase tracking-widest transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-black tracking-tight">Password & Security</h1>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Keep your account safe with a strong password</p>
      </div>

      {/* Tips card */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <p className="text-[12px] font-black text-[var(--color-foreground)]">Password tips</p>
          <ul className="space-y-0.5 text-[11px] text-[var(--color-muted)]">
            <li>· At least 8 characters</li>
            <li>· Mix uppercase, numbers and symbols</li>
            <li>· Never reuse passwords from other sites</li>
          </ul>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-5 space-y-4">
          <PasswordField
            label="Current Password"
            value={current}
            onChange={setCurrent}
            required
          />

          <div className="border-t border-[var(--color-border)]/50 pt-4 space-y-4">
            <div>
              <PasswordField
                label="New Password"
                value={next}
                onChange={setNext}
                placeholder="Choose a strong password"
                required
              />
              <StrengthBar password={next} />
            </div>

            <div>
              <PasswordField
                label="Confirm New Password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat new password"
                required
              />
              {mismatch && (
                <p className="mt-1.5 text-[11px] font-bold text-red-500 pl-0.5">
                  Passwords don't match
                </p>
              )}
            </div>
          </div>
        </div>

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
              {msg.ok ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={isLoading || mismatch}
          className="w-full h-14 rounded-2xl bg-[var(--color-foreground)] text-[var(--color-background)] font-black uppercase tracking-widest text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
          ) : (
            <><Lock className="w-4 h-4" /> Update Password</>
          )}
        </button>
      </form>

      {/* Forgot password link */}
      <p className="text-center text-[11px] text-[var(--color-muted)]">
        Forgot your current password?{" "}
        <Link href="/forgot-password" className="font-bold text-[var(--color-accent)] hover:underline">
          Reset it here
        </Link>
      </p>
    </div>
  );
}
