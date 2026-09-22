'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Shield,
  Coins,
  Clock,
  Mail,
  Phone,
  Power,
  CheckCircle2,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { VendlySettingsService } from '@/services/settings.service';
import type { PlatformSettings } from '@/types/operations';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    platform_fee_percent: 4.0,
    escrow_release_days: 3,
    min_payout_amount: 50,
    maintenance_mode: false,
    support_email: 'support@vendly.market',
    support_phone: '+233 53 406 5652',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const data = await VendlySettingsService.getSettings();
        if (data) setSettings(data);
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    void loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.maintenance_mode) {
      const ok = await confirm({
        title: 'Activate Maintenance Mode?',
        description:
          'Warning: Enabling Maintenance Mode will pause public storefront orders and display an emergency banner. Are you sure you want to save this setting?',
        confirmText: 'Yes, Enable Maintenance Mode',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await VendlySettingsService.updateSettings(settings);
      success('Platform configuration saved successfully');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
            Platform Settings & Economics
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            Configure platform commission, escrow timelines, payout limits, and emergency controls.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 text-xs">
            {/* Marketplace Commission & Fees */}
            <div className="bg-card border-border space-y-4 rounded-2xl border p-5">
              <div className="border-border flex items-center gap-2.5 border-b pb-3">
                <div className="bg-brand/10 text-brand flex h-8 w-8 items-center justify-center rounded-lg">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-semibold">Marketplace Economics</h3>
                  <p className="text-muted-foreground text-[11px]">
                    Split payment percentages and settlement criteria
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-foreground font-medium">Platform Commission Fee (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settings.platform_fee_percent}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        platform_fee_percent: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="text-xs"
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Percentage retained on every successful merchant sale (Default: 4.0%).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground font-medium">
                    Escrow Auto-Release Window (Days)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.escrow_release_days}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        escrow_release_days: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="text-xs"
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Days after delivery before funds automatically unlock for merchant payout.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground font-medium">
                    Minimum Payout Threshold (₵)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={settings.min_payout_amount}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        min_payout_amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="text-xs"
                  />
                  <p className="text-muted-foreground text-[11px]">
                    Minimum balance required before a seller can request manual payout.
                  </p>
                </div>
              </div>
            </div>

            {/* Support & Contacts */}
            <div className="bg-card border-border space-y-4 rounded-2xl border p-5">
              <div className="border-border flex items-center gap-2.5 border-b pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-semibold">Support Channels</h3>
                  <p className="text-muted-foreground text-[11px]">
                    Displayed to merchants and buyers on receipts and dispute resolution
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-foreground font-medium">Support Email</label>
                  <Input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        support_email: e.target.value,
                      }))
                    }
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground font-medium">Support Phone / WhatsApp</label>
                  <Input
                    type="tel"
                    value={settings.support_phone || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        support_phone: e.target.value,
                      }))
                    }
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* System Status & Maintenance */}
            <div className="bg-card border-border space-y-4 rounded-2xl border p-5">
              <div className="border-border flex items-center gap-2.5 border-b pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                  <Power className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-foreground text-sm font-semibold">Emergency Controls</h3>
                  <p className="text-muted-foreground text-[11px]">
                    Temporary operational freeze for database migrations or maintenance
                  </p>
                </div>
              </div>

              <div className="bg-muted/40 border-border flex items-center justify-between rounded-xl border p-3.5">
                <div>
                  <p className="text-foreground font-medium">Maintenance Mode</p>
                  <p className="text-muted-foreground text-[11px]">
                    When active, public storefront orders are paused with a notice banner.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      maintenance_mode: e.target.checked,
                    }))
                  }
                  className="text-brand focus:ring-brand border-border h-4 w-4 rounded"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand hover:bg-brand-hover px-5 text-xs text-white"
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}
