"use client";

import React, { useState } from "react";
import { Mail, MessageSquare, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import Header from "@/components/layout/Header";
import { contactApi } from "@/lib/api/contact";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      setErrors({ message: err?.response?.data?.message || "Failed to send message. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-24 grid grid-cols-1 lg:grid-cols-5 gap-10">
        <aside className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Get in touch</p>
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight">We're here to help.</h1>
            <p className="text-sm text-muted leading-relaxed">
              Fill out the form and we'll respond within 24 hours, or reach us directly via
              any of the channels below.
            </p>
          </div>

          <ul className="space-y-3">
            <ContactRow icon={Mail} label="Email" value="alikamatu14@gmail.com" href="mailto:alikamatu14@gmail.com" />
            <ContactRow icon={MessageSquare} label="WhatsApp" value="+233 53 406 5652" href="https://wa.me/233534065652" />
            <ContactRow icon={Phone} label="Phone" value="+233 53 406 5652" href="tel:+233534065652" />
            <ContactRow icon={MapPin} label="HQ" value="Accra, Ghana" />
          </ul>
        </aside>

        <form onSubmit={submit} className="lg:col-span-3 space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm" noValidate>
          {submitted && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 text-xs font-medium border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Message sent — we'll be in touch soon.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs font-medium"
          >
            <Send className="w-3.5 h-3.5 mr-2" />
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
    <span className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-surface/40 hover:bg-surface transition-colors">
      <span className="inline-flex w-9 h-9 rounded-xl bg-primary/10 text-primary items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</span>
        <span className="text-[13px] font-normal text-foreground">{value}</span>
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

