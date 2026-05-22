"use client";

import React, { useState } from "react";
import { Mail, MessageSquare, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Please tell us your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.subject.trim().length < 3) e.subject = "Add a short subject";
    if (form.message.trim().length < 20) e.message = "Message must be at least 20 characters";
    return e;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    // TODO: wire to /api/contact or Resend
    setSubmitted(true);
    setForm({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Contact" />

      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-24 grid grid-cols-1 lg:grid-cols-5 gap-10">
        <aside className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Get in touch</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">We're here to help.</h1>
            <p className="text-sm text-muted leading-relaxed">
              Fill out the form and we'll respond within 24 hours, or reach us directly via
              any of the channels below.
            </p>
          </div>

          <ul className="space-y-3">
            <ContactRow icon={Mail} label="Email" value="hello@vendly.com" href="mailto:hello@vendly.com" />
            <ContactRow icon={MessageSquare} label="WhatsApp" value="+233 24 000 0000" href="https://wa.me/233240000000" />
            <ContactRow icon={Phone} label="Phone" value="+233 24 000 0000" href="tel:+233240000000" />
            <ContactRow icon={MapPin} label="HQ" value="Accra, Ghana" />
          </ul>
        </aside>

        <form onSubmit={submit} className="lg:col-span-3 space-y-3" noValidate>
          {submitted && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 text-[12px] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Message sent — we'll be in touch soon.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Your name"
              value={form.name}
              onChange={(v) => setForm((p) => ({ ...p, name: v }))}
              error={errors.name}
              autoComplete="name"
            />
            <Field
              label="Email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(v) => setForm((p) => ({ ...p, email: v }))}
              error={errors.email}
              autoComplete="email"
            />
          </div>
          <Field
            label="Subject"
            value={form.subject}
            onChange={(v) => setForm((p) => ({ ...p, subject: v }))}
            error={errors.subject}
          />
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted px-1">
              Message
            </label>
            <textarea
              rows={6}
              maxLength={2000}
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              className={`w-full rounded-2xl border bg-surface px-4 py-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
                errors.message ? "border-red-500/50" : "border-border focus:border-primary/40"
              }`}
            />
            {errors.message && <p className="text-[10px] font-bold text-red-500 px-1">{errors.message}</p>}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-white text-[12px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            <Send className="w-3.5 h-3.5" />
            Send message
          </button>
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
    <span className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-surface/40 hover:bg-surface transition-colors">
      <span className="inline-flex w-9 h-9 rounded-xl bg-primary/10 text-primary items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</span>
        <span className="text-[13px] font-bold text-foreground">{value}</span>
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

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  inputMode?: any;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted px-1 block">
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-11 rounded-2xl border bg-surface px-4 text-[13px] font-bold outline-none focus:ring-2 focus:ring-primary/30 transition-all ${
          error ? "border-red-500/50" : "border-border focus:border-primary/40"
        }`}
      />
      {error && <p className="text-[10px] font-bold text-red-500 px-1">{error}</p>}
    </div>
  );
}
