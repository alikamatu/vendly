'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { cn } from '@/lib/utils';
import {
  ADMIN_EMAIL_TEMPLATES,
  previewEmail,
  type AdminEmailTemplate,
  type EmailTemplateCategory,
} from '@/lib/admin-email-templates';
import { VendlyEmailCampaignService } from '@/services/email-campaign.service';
import type { AdminSmsRecipient } from '@/services/sms.service';
import { EmailPreview } from './EmailPreview';

const CATEGORIES: Array<'All' | EmailTemplateCategory> = [
  'All',
  'Verification',
  'Onboarding',
  'Operations',
  'Growth',
];

export function AdminEmailSection({
  selectedUsers,
}: {
  selectedUsers: Map<string, AdminSmsRecipient>;
}) {
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('All');
  const [activeId, setActiveId] = useState<string>(ADMIN_EMAIL_TEMPLATES[0].id);
  const [draft, setDraft] = useState<AdminEmailTemplate>(ADMIN_EMAIL_TEMPLATES[0]);
  const [sending, setSending] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [fromAddress, setFromAddress] = useState('');

  useEffect(() => {
    void VendlyEmailCampaignService.getStatus()
      .then((status) => {
        setConfigured(status.configured);
        setFromAddress(status.fromAddress);
      })
      .catch(() => setConfigured(false));
  }, []);

  const templates = useMemo(
    () =>
      filter === 'All'
        ? ADMIN_EMAIL_TEMPLATES
        : ADMIN_EMAIL_TEMPLATES.filter((t) => t.category === filter),
    [filter],
  );

  const sample = Array.from(selectedUsers.values())[0];
  const preview = previewEmail(draft, {
    name: sample?.full_name,
    storeName: sample?.store_name,
  });
  const recipients = Array.from(selectedUsers.values()).filter((user) => user.email?.includes('@'));

  const load = (template: AdminEmailTemplate) => {
    setActiveId(template.id);
    setDraft(template);
  };

  const send = async () => {
    if (recipients.length === 0) {
      toastError('Select at least one user with an email address.');
      return;
    }
    const ok = await confirm({
      title: `Email ${recipients.length} user${recipients.length === 1 ? '' : 's'}?`,
      description: configured
        ? `This sends a live Verndly email from ${fromAddress || 'the configured address'}.`
        : 'Resend is not configured on the API, so these emails will not be delivered.',
      details: (
        <div className="space-y-2 text-xs">
          <p className="text-foreground font-medium">{preview.subject}</p>
          <p className="text-muted-foreground">{preview.headline}</p>
          <p className="text-muted-foreground">
            {recipients
              .slice(0, 5)
              .map((user) => user.email)
              .join(', ')}
            {recipients.length > 5 ? ` +${recipients.length - 5} more` : ''}
          </p>
        </div>
      ),
      confirmText: `Send ${recipients.length} email${recipients.length === 1 ? '' : 's'}`,
      variant: 'info',
      icon: 'check',
    });
    if (!ok) return;

    setSending(true);
    try {
      const res = await VendlyEmailCampaignService.send(
        draft,
        recipients.map((user) => user.id),
      );
      if (res.sentCount > 0 && res.failedCount === 0) {
        success(`Sent ${res.sentCount} reminder email${res.sentCount === 1 ? '' : 's'}.`);
      } else if (res.sentCount > 0) {
        toastError(
          `Sent ${res.sentCount}, ${res.failedCount} failed, ${res.invalidCount} invalid.`,
        );
      } else {
        toastError(res.results[0]?.error || 'Email was not sent.');
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-border bg-card w-full min-w-0 space-y-4 rounded-2xl border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <Mail className="text-brand h-4 w-4" />
            Reminder emails
          </h3>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            Same Verndly email layout as approval and account messages. Sent to the users selected
            above. {'{first_name}'}, {'{name}'}, and {'{store_name}'} are filled in for each person.
          </p>
        </div>
        {configured === false && <Badge variant="warning">Email not configured</Badge>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-semibold',
              filter === category
                ? 'bg-foreground text-background'
                : 'bg-muted/60 text-muted-foreground',
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => load(template)}
            className={cn(
              'rounded-xl border p-3 text-left',
              activeId === template.id ? 'border-brand bg-brand/5' : 'border-border/70',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground text-xs font-semibold">{template.title}</span>
              <Badge variant="outline">{template.category}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-[11px]">
              {template.description}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Subject
            </label>
            <input
              value={draft.subject}
              onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
              className="border-border bg-background text-foreground focus:ring-brand h-10 w-full rounded-xl border px-3 text-xs focus:outline-none focus:ring-1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Headline
            </label>
            <input
              value={draft.headline}
              onChange={(event) => setDraft((prev) => ({ ...prev, headline: event.target.value }))}
              className="border-border bg-background text-foreground focus:ring-brand h-10 w-full rounded-xl border px-3 text-xs focus:outline-none focus:ring-1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Body (blank line = new paragraph)
            </label>
            <textarea
              rows={9}
              value={draft.paragraphs.join('\n\n')}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  paragraphs: event.target.value
                    .split(/\n\s*\n/)
                    .map((paragraph) => paragraph.trim())
                    .filter(Boolean),
                }))
              }
              className="border-border bg-background text-foreground focus:ring-brand w-full rounded-xl border p-3 text-xs leading-relaxed focus:outline-none focus:ring-1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Button label
            </label>
            <input
              value={draft.ctaLabel}
              onChange={(event) => setDraft((prev) => ({ ...prev, ctaLabel: event.target.value }))}
              className="border-border bg-background text-foreground focus:ring-brand h-10 w-full rounded-xl border px-3 text-xs focus:outline-none focus:ring-1"
            />
          </div>
        </div>

        <EmailPreview
          fromAddress={fromAddress}
          toLabel={
            sample?.email
              ? `${sample.full_name} <${sample.email}>${recipients.length > 1 ? ` +${recipients.length - 1} more` : ''}`
              : 'Kwame Mensah <kwame@example.com>'
          }
          subject={preview.subject}
          preheader={draft.preheader}
          eyebrow={draft.eyebrow}
          statusLabel={draft.statusLabel}
          statusVariant={draft.statusVariant}
          headline={preview.headline}
          paragraphs={preview.paragraphs}
          ctaLabel={draft.ctaLabel}
          ctaUrl={`https://verndly.com${draft.ctaPath}`}
        />
      </div>

      <Button
        type="button"
        onClick={() => void send()}
        disabled={sending || recipients.length === 0}
        className="bg-brand hover:bg-brand-hover h-11 w-full text-xs font-semibold text-white"
      >
        {sending ? <Spinner size="sm" className="mr-2" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
        Send email to {recipients.length} user{recipients.length === 1 ? '' : 's'}
      </Button>
    </div>
  );
}
