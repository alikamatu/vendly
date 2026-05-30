'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { authApi } from '@/lib/api/auth';

export default function DataPrivacyPage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) return null;

  const handleExportData = async () => {
    if (!token) return;
    setIsExporting(true);
    setMsg(null);
    try {
      const data = await authApi.exportData(token);
      // Create a blob and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verndly-data-export-${user.id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMsg({ ok: true, text: 'Data exported successfully!' });
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Failed to export data.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setIsDeleting(true);
    setMsg(null);
    try {
      await authApi.deleteAccount(token);
      await logout();
      router.push('/');
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Failed to delete account.' });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-16">
      {/* Back Link */}
      <Link
        href="/account"
        className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight">Data & Privacy</h1>
        <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
          Manage your personal data and account deletion
        </p>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
              msg.ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                : 'border-red-500/30 bg-red-500/10 text-red-600'
            }`}
          >
            {msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Section */}
      <div className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
            <Download className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--color-foreground)]">Export your data</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted)]">
              Download a copy of your personal data, including your profile, saved items, addresses,
              and order history in JSON format.
            </p>
          </div>
        </div>
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-border)]/50 text-sm font-medium transition-colors hover:bg-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing Export...
            </>
          ) : (
            'Request Data Export'
          )}
        </button>
      </div>

      {/* Delete Section */}
      <div className="space-y-4 rounded-3xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/10">
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-500">Delete Account</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-muted)]">
              Permanently delete your account and all associated data. If you have placed orders or
              sold items, your account will be anonymized to preserve order history for accounting
              purposes.
            </p>
          </div>
        </div>

        {showDeleteConfirm ? (
          <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-xs font-medium text-red-500">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, delete account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex h-10 flex-1 items-center justify-center rounded-lg bg-transparent text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-border)]/50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
          >
            <Trash2 className="h-4 w-4" /> Delete Account
          </button>
        )}
      </div>
    </div>
  );
}
