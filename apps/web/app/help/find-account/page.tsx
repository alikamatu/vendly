'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { authApi } from '@/lib/api/auth';
import { guardPhoneKeyDown, sanitizePhoneNumber } from '@/lib/utils/phone';

/**
 * Public "I can't remember which email I used" page. Submits to the API,
 * which files a support ticket — we never reveal whether any account
 * matched, to avoid leaking who's registered.
 */
import Textarea from '@/components/ui/Textarea';

export default function FindAccountPage() {
  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    contact_email: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const onChange =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.findAccount(form);
      setDone(res.message);
    } catch (err: any) {
      setError(err?.message || 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="border-border bg-surface w-full max-w-md space-y-4 rounded-3xl border p-8 text-center">
          <div className="shadow-xs mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Request sent</h1>
          <p className="text-foreground/60 text-xs leading-relaxed">{done}</p>
          {form.contact_email && (
            <p className="text-foreground/50 text-xs">
              We&apos;ll reply to{' '}
              <span className="text-foreground/80 font-medium">{form.contact_email}</span>.
            </p>
          )}
          <div className="pt-2">
            <Link
              href="/login"
              className="bg-foreground text-background inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="border-border bg-surface w-full max-w-md space-y-6 rounded-3xl border p-8">
        <div>
          <Link
            href="/login"
            className="text-foreground/50 hover:text-foreground group inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />{' '}
            Back to sign in
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Find my account</h1>
          <p className="text-foreground/60 mt-1 text-xs leading-relaxed">
            Tell us what you remember and our support team will help you recover access. Everything
            below is optional except your name.
          </p>
        </div>

        {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Your full name"
            value={form.full_name}
            onChange={onChange('full_name')}
            required
            autoComplete="name"
            placeholder="e.g. Ama Serwaa"
          />
          <Input
            label="Business name (if any)"
            value={form.business_name}
            onChange={onChange('business_name')}
            autoComplete="organization"
            placeholder="e.g. Serwaa Bakes"
          />
          <Input
            label="Phone number"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: sanitizePhoneNumber(e.target.value) }))}
            onKeyDown={(e) => guardPhoneKeyDown(e)}
            inputMode="numeric"
            placeholder="0244123456"
            autoComplete="tel"
          />
          <Input
            label="Contact email (where we can reach you)"
            type="email"
            value={form.contact_email}
            onChange={onChange('contact_email')}
            icon={<Mail size={16} />}
            autoComplete="email"
            placeholder="ama@example.com"
          />
          <Textarea
            label="Anything else that might help us find you"
            value={form.note}
            onChange={onChange('note')}
            rows={3}
            maxLength={500}
            placeholder="e.g. I signed up around July, my store was called ‘Bissi Baby’."
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="h-11 w-full"
              isLoading={submitting}
              loadingText="Sending request..."
              disabled={submitting || !form.full_name.trim()}
            >
              Send to support
            </Button>
          </div>
        </form>

        <p className="text-foreground/50 text-center text-[11px]">
          Prefer to email us directly?{' '}
          <a
            href="mailto:support@verndly.app?subject=Forgot%20my%20email"
            className="text-accent hover:underline"
          >
            support@verndly.app
          </a>
        </p>
      </div>
    </div>
  );
}
