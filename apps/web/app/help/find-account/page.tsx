"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { authApi } from "@/lib/api/auth";

/**
 * Public "I can't remember which email I used" page. Submits to the API,
 * which files a support ticket — we never reveal whether any account
 * matched, to avoid leaking who's registered.
 */
export default function FindAccountPage() {
  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    phone: "",
    contact_email: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.findAccount(form);
      setDone(res.message);
    } catch (err: any) {
      setError(err?.message || "Could not submit your request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-medium">Request sent</h1>
          <p className="text-sm text-foreground/60">{done}</p>
          {form.contact_email && (
            <p className="text-xs text-foreground/50">
              We&apos;ll reply to{" "}
              <span className="font-medium text-foreground/80">{form.contact_email}</span>.
            </p>
          )}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
          <h1 className="text-2xl tracking-tight mt-3">Find my account</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Tell us what you remember and our support team will help you
            recover access. Everything below is optional except your name.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <Input
            label="Your full name"
            value={form.full_name}
            onChange={onChange("full_name")}
            required
            autoComplete="name"
          />
          <Input
            label="Business name (if any)"
            value={form.business_name}
            onChange={onChange("business_name")}
            autoComplete="organization"
          />
          <Input
            label="Phone number"
            value={form.phone}
            onChange={onChange("phone")}
            placeholder="+233201234567"
            autoComplete="tel"
          />
          <Input
            label="Contact email (where we can reach you)"
            type="email"
            value={form.contact_email}
            onChange={onChange("contact_email")}
            icon={<Mail size={18} />}
            autoComplete="email"
          />
          <div>
            <label className="block text-xs uppercase tracking-wider text-foreground/60 mb-1">
              Anything else that might help us find you
            </label>
            <textarea
              value={form.note}
              onChange={onChange("note")}
              rows={3}
              maxLength={500}
              placeholder="e.g. I signed up around July, my store was called ‘Bissi Baby’."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={submitting}
            disabled={submitting || !form.full_name.trim()}
          >
            {submitting ? "Sending…" : "Send to support"}
          </Button>
        </form>

        <p className="text-center text-[11px] text-foreground/50">
          Prefer to email us directly?{" "}
          <a
            href="mailto:support@verndly.com?subject=Forgot%20my%20email"
            className="text-accent hover:underline"
          >
            support@verndly.com
          </a>
        </p>
      </div>
    </div>
  );
}
