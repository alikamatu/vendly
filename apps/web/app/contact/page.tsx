'use client';

import React, { useState } from 'react';
import { Mail, MessageSquare, Phone, MapPin, Clock, Send } from 'lucide-react';
import Header from '@/components/layout/Header';
import { contactApi } from '@/lib/api/contact';
import { SUPPORT_CONTACT } from '@/lib/contact';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Please tell us your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.subject.trim().length < 3) e.subject = 'Add a short subject';
    if (form.message.trim().length < 20) e.message = 'Message must be at least 20 characters';
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    try {
      setIsSubmitting(true);
      await contactApi.submitContactForm(form);
      setSubmitted(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setErrors({
        message: err?.response?.data?.message || 'Failed to send message. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 pb-24 pt-10 md:px-8 md:pt-16 lg:grid-cols-5">
        <aside className="space-y-6 lg:col-span-2">
          <div className="space-y-2">
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">
              Get in touch
            </p>
            <h1 className="text-3xl font-medium tracking-tight md:text-4xl">We're here to help.</h1>
            <p className="text-muted text-sm leading-relaxed">
              Fill out the form and we'll respond within 24 hours, or reach us directly via any of
              the channels below.
            </p>
          </div>

          <ul className="space-y-3">
            <ContactRow
              icon={Mail}
              label="Email"
              value={SUPPORT_CONTACT.email}
              href={SUPPORT_CONTACT.emailHref}
            />
            <ContactRow
              icon={MessageSquare}
              label="WhatsApp"
              value={SUPPORT_CONTACT.phoneDisplay}
              href={SUPPORT_CONTACT.whatsappHref}
            />
            <ContactRow
              icon={Phone}
              label="Phone"
              value={SUPPORT_CONTACT.phoneDisplay}
              href={SUPPORT_CONTACT.phoneHref}
            />
            <ContactRow icon={Clock} label="Hours" value={SUPPORT_CONTACT.hours} />
            <ContactRow icon={MapPin} label="HQ" value={SUPPORT_CONTACT.location} />
          </ul>
        </aside>

        <form
          onSubmit={submit}
          className="border-border bg-card space-y-4 rounded-3xl border p-6 shadow-sm md:p-8 lg:col-span-3"
          noValidate
        >
          {submitted && (
            <Alert
              variant="success"
              message="Message sent — we'll be in touch soon."
              onDismiss={() => setSubmitted(false)}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Your name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={errors.name}
              autoComplete="name"
              placeholder="Akua Mensah"
            />
            <Input
              label="Email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              error={errors.email}
              autoComplete="email"
              placeholder="akua@example.com"
            />
          </div>
          <Input
            label="Subject"
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            error={errors.subject}
            placeholder="How can we assist you?"
          />
          <Textarea
            label="Message"
            rows={5}
            maxLength={2000}
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            error={errors.message}
            placeholder="Tell us about your inquiry..."
          />

          <Button
            type="submit"
            isLoading={isSubmitting}
            loadingText="Sending message…"
            className="h-11 w-full rounded-xl px-6 text-xs font-medium sm:w-auto"
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            Send message
          </Button>
        </form>
      </main>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: any;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <span className="border-border bg-surface/40 hover:bg-surface flex items-center gap-3 rounded-2xl border p-3 transition-colors">
      <span className="bg-primary/10 text-primary inline-flex h-9 w-9 items-center justify-center rounded-xl">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex flex-col">
        <span className="text-muted text-[10px] font-medium uppercase tracking-wider">{label}</span>
        <span className="text-foreground text-[13px] font-normal">{value}</span>
      </span>
    </span>
  );
  return (
    <li>
      {href ? (
        <a href={href} className="block">
          {inner}
        </a>
      ) : (
        inner
      )}
    </li>
  );
}
