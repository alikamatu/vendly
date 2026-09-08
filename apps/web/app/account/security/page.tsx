"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Key,
  Check,
  AlertCircle,
  ShieldCheck,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/auth-context";
import { authApi } from "@/lib/api/auth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PasswordStrength from "@/components/auth/PasswordStrength";

export default function AccountSecurityPage() {
  const { token } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (next !== confirm) {
      setMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    if (next.length < 8) {
      setMsg({ ok: false, text: "Choose a stronger password (minimum 8 characters)." });
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
    <div className="max-w-lg mx-auto space-y-6 pb-16">
      {/* Back */}
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-xl font-medium tracking-tight">Password & Security</h1>
        <p className="text-xs text-muted mt-1">Keep your account safe with a strong password</p>
      </div>

      {/* Tips card */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3.5 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Password recommendations</p>
          <ul className="space-y-0.5 text-[11px] text-muted leading-relaxed">
            <li>• At least 8 characters with upper & lowercase letters</li>
            <li>• Include numbers and special symbols</li>
            <li>• Never reuse passwords across different services</li>
          </ul>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <Input
            label="Current Password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            icon={<Key size={18} />}
          />

          <div className="border-t border-border/50 pt-4 space-y-4">
            <div className="space-y-2">
              <Input
                label="New Password"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Choose a strong password"
                required
                autoComplete="new-password"
                icon={<Lock size={18} />}
              />
              <PasswordStrength password={next} />
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              required
              autoComplete="new-password"
              error={mismatch ? "Passwords don't match" : undefined}
              icon={<Lock size={18} />}
            />
          </div>
        </div>

        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-medium ${
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

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Updating Password…"
          disabled={mismatch || !current || !next}
          className="w-full h-12 rounded-xl text-xs font-medium"
        >
          Update Password
        </Button>
      </form>

      {/* Forgot password link */}
      <p className="text-center text-xs text-muted">
        Forgot your current password?{" "}
        <Link href="/forgot-password" className="font-medium text-foreground hover:underline">
          Reset it here
        </Link>
      </p>
    </div>
  );
}
