'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Key, Smartphone, Check, Info } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/lib/contexts/auth-context';
import { authApi } from '@/lib/api/auth';
import TwoFactorPanel from '@/components/settings/TwoFactorPanel';

export default function SecuritySettingsPage() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      await authApi.updateProfile(token, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setMessage({ type: 'success', text: 'Password updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/settings"
        className="text-muted hover:text-foreground group mb-2 inline-flex items-center gap-2 text-xs font-normal transition-colors"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Settings
      </Link>

      <div className="px-2">
        <h2 className="text-md font-medium uppercase tracking-tight">Security & Privacy</h2>
        <p className="text-muted mt-1 text-xs font-medium">
          Protect your account and manage authentication
        </p>
      </div>

      <div className="space-y-8 pb-10">
        {/* Password Change Form */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="bg-primary/10 text-primary rounded-xl p-2">
              <Key className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-medium uppercase">Change Password</h3>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <Card className="space-y-4 border-none p-6 shadow-sm md:p-8" hoverEffect={false}>
              <div className="space-y-2">
                <label className="text-muted px-1 text-[10px] font-normal uppercase tracking-wider">
                  Current Password
                </label>
                {/* The shared Input now ships its own show/hide toggle and
                    Caps-Lock indicator — no need for the per-field external
                    eye buttons + showCurrent/showNew state we used to have.
                    autoComplete tells browsers which saved password to offer. */}
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={passwordData.current_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current_password: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                  className="bg-background/50 h-12 text-xs font-normal"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-muted px-1 text-[10px] font-normal uppercase tracking-wider">
                    New Password
                  </label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, new_password: e.target.value })
                    }
                    placeholder="••••••••"
                    required
                    className="bg-background/50 h-12 text-xs font-normal"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-muted px-1 text-[10px] font-normal uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirm_password: e.target.value })
                    }
                    placeholder="••••••••"
                    required
                    className="bg-background/50 h-12 text-xs font-normal"
                  />
                </div>
              </div>

              {message && (
                <Alert
                  variant={message.type}
                  message={message.text}
                  onDismiss={() => setMessage(null)}
                />
              )}

              <Button
                type="submit"
                isLoading={isLoading}
                loadingText="Updating Password…"
                className="mt-4 h-12 w-full rounded-xl text-xs font-medium"
              >
                Update Password
              </Button>
            </Card>
          </form>
        </section>

        <TwoFactorPanel />
      </div>
    </div>
  );
}
