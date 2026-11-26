'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield,
  ShieldCheck,
  Smartphone,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Key,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import Alert from '@/components/ui/Alert';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/lib/contexts/auth-context';

type Stage =
  | 'loading'
  | 'off'
  | 'choose-method'
  | 'setup-qr'
  | 'setup-verify'
  | 'sms-phone'
  | 'sms-verify'
  | 'show-codes'
  | 'on'
  | 'disabling';

type Method = 'TOTP' | 'SMS';

export default function TwoFactorPanel() {
  const { token } = useAuth();
  const [stage, setStage] = useState<Stage>('loading');
  const [status, setStatus] = useState<{
    enabled: boolean;
    method: Method;
    verified_at: string | null;
    backup_codes_remaining: number;
    phone_hint: string | null;
  } | null>(null);
  const [chosenMethod, setChosenMethod] = useState<Method>('TOTP');
  const [phoneInput, setPhoneInput] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [phoneHintForSetup, setPhoneHintForSetup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [setupData, setSetupData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenPassword, setRegenPassword] = useState('');

  const refreshStatus = async () => {
    if (!token) return;
    try {
      const s = await authApi.twoFactorStatus(token);
      setStatus(s);
      setStage(s.enabled ? 'on' : 'off');
    } catch (e: any) {
      setError(e?.message || 'Failed to load 2FA status');
      setStage('off');
    }
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const beginEnrolment = () => {
    setError(null);
    setStage('choose-method');
  };

  const startSetup = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await authApi.twoFactorSetup(token);
      setSetupData(data);
      setStage('setup-qr');
    } catch (e: any) {
      setError(e?.message || 'Failed to start setup');
    } finally {
      setBusy(false);
    }
  };

  const startSmsSetup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.twoFactorSmsSetup(token, phoneInput);
      setPhoneHintForSetup(res.phone_hint);
      setStage('sms-verify');
    } catch (e: any) {
      setError(e?.message || 'Failed to send code');
    } finally {
      setBusy(false);
    }
  };

  const completeSmsEnable = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.twoFactorSmsEnable(token, smsCode);
      setBackupCodes(res.backup_codes);
      setSmsCode('');
      setPhoneInput('');
      setStage('show-codes');
    } catch (e: any) {
      setError(e?.message || 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const completeEnable = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.twoFactorEnable(token, verifyCode);
      setBackupCodes(res.backup_codes);
      setVerifyCode('');
      setSetupData(null);
      setStage('show-codes');
    } catch (e: any) {
      setError(e?.message || 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const doDisable = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.twoFactorDisable(token, {
        password: disablePassword,
        totp_code: disableCode || undefined,
      });
      setDisablePassword('');
      setDisableCode('');
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Failed to disable');
    } finally {
      setBusy(false);
    }
  };

  const doRegenerate = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.twoFactorRegenerateBackup(token, regenPassword);
      setBackupCodes(res.backup_codes);
      setRegenPassword('');
      setStage('show-codes');
      await refreshStatus();
    } catch (e: any) {
      setError(e?.message || 'Failed to regenerate codes');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, target: 'secret' | 'codes') => {
    try {
      await navigator.clipboard.writeText(text);
      if (target === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 1500);
      } else {
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 1500);
      }
    } catch {
      // ignore
    }
  };

  if (stage === 'loading') {
    return (
      <Card className="flex items-center justify-center p-8">
        <Spinner size="md" />
      </Card>
    );
  }

  const header = (
    <div className="flex items-center gap-3 px-2">
      <div className="rounded-xl bg-purple-500/10 p-2 text-purple-500">
        <Smartphone className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-medium uppercase">Two-Factor Auth</h3>
    </div>
  );

  return (
    <section className="space-y-4">
      {header}

      {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}

      {/* Off → CTA */}
      {stage === 'off' && (
        <Card className="flex items-center justify-between p-6 md:p-8">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Shield className="text-muted h-4 w-4" /> Not enabled
            </p>
            <p className="text-muted max-w-md text-[11px] leading-relaxed">
              Add a 6-digit code to every sign-in via an authenticator app or SMS. Recommended for
              any seller handling payouts.
            </p>
          </div>
          <Button onClick={beginEnrolment} disabled={busy}>
            Enable 2FA
          </Button>
        </Card>
      )}

      {/* Choose method */}
      {stage === 'choose-method' && (
        <Card className="space-y-4 p-6 md:p-8">
          <div>
            <p className="text-sm font-medium">Choose a method</p>
            <p className="text-muted mt-1 text-[11px]">
              You can change this later by disabling and re-enrolling.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setChosenMethod('TOTP')}
              className={`rounded-xl border p-4 text-left transition ${
                chosenMethod === 'TOTP'
                  ? 'border-accent bg-accent/5'
                  : 'border-border/60 hover:border-foreground/40'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4" /> Authenticator app
              </div>
              <div className="text-muted mt-1 text-[11px]">
                Works offline. Google Authenticator, Authy, 1Password, etc.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setChosenMethod('SMS')}
              className={`rounded-xl border p-4 text-left transition ${
                chosenMethod === 'SMS'
                  ? 'border-accent bg-accent/5'
                  : 'border-border/60 hover:border-foreground/40'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4" /> SMS code
              </div>
              <div className="text-muted mt-1 text-[11px]">
                We text a 6-digit code each time you sign in.
              </div>
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStage('off')}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (chosenMethod === 'TOTP') startSetup();
                else setStage('sms-phone');
              }}
              disabled={busy}
            >
              Continue
            </Button>
          </div>
        </Card>
      )}

      {/* SMS: phone entry */}
      {stage === 'sms-phone' && (
        <Card className="space-y-4 p-6 md:p-8">
          <form onSubmit={startSmsSetup} className="space-y-4">
            <div>
              <p className="text-sm font-medium">Phone number</p>
              <p className="text-muted mt-1 text-[11px]">
                In international (E.164) format, e.g. <code>+233201234567</code>. We&apos;ll text a
                6-digit code to verify.
              </p>
            </div>
            <Input
              label="Phone"
              type="tel"
              value={phoneInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneInput(e.target.value)}
              placeholder="+233201234567"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setStage('choose-method')}>
                Back
              </Button>
              <Button
                type="submit"
                isLoading={busy}
                loadingText="Sending…"
                disabled={!phoneInput.trim()}
              >
                Send code
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* SMS: verify */}
      {stage === 'sms-verify' && (
        <Card className="space-y-4 p-6 md:p-8">
          <form onSubmit={completeSmsEnable} className="space-y-4">
            <div>
              <p className="text-sm font-medium">Verify your phone</p>
              <p className="text-muted mt-1 text-[11px]">
                Enter the 6-digit code we sent to {phoneHintForSetup || 'your phone'}.
              </p>
            </div>
            <Input
              label="Code"
              type="text"
              inputMode="numeric"
              value={smsCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmsCode(e.target.value)}
              placeholder="123456"
              icon={<Key size={18} />}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setStage('sms-phone')}>
                Back
              </Button>
              <Button
                type="submit"
                isLoading={busy}
                loadingText="Verifying…"
                disabled={smsCode.length < 6}
              >
                Enable SMS 2FA
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Setup: scan QR */}
      {stage === 'setup-qr' && setupData && (
        <Card className="space-y-5 p-6 md:p-8">
          <div>
            <p className="text-sm font-medium">Scan with your authenticator app</p>
            <p className="text-muted mt-1 text-[11px]">
              Google Authenticator, Authy, 1Password, Bitwarden, etc.
            </p>
          </div>
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={setupData.otpauth_url} size={176} />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-muted mb-1 text-[10px] uppercase tracking-wider">
                  Or paste the secret manually
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-surface border-border/60 truncate rounded border px-2 py-1 font-mono text-xs">
                    {setupData.secret}
                  </code>
                  <button
                    onClick={() => copy(setupData.secret, 'secret')}
                    className="hover:bg-surface text-muted rounded p-1.5"
                    aria-label="Copy secret"
                  >
                    {copiedSecret ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <Button onClick={() => setStage('setup-verify')} className="w-full md:w-auto">
                I&apos;ve added the account
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Setup: verify */}
      {stage === 'setup-verify' && (
        <Card className="space-y-4 p-6 md:p-8">
          <form onSubmit={completeEnable} className="space-y-4">
            <div>
              <p className="text-sm font-medium">Verify your authenticator</p>
              <p className="text-muted mt-1 text-[11px]">
                Enter the 6-digit code shown in your authenticator app.
              </p>
            </div>
            <Input
              label="Code"
              value={verifyCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerifyCode(e.target.value)}
              type="text"
              inputMode="numeric"
              placeholder="123456"
              icon={<Key size={18} />}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setStage('setup-qr')}>
                Back
              </Button>
              <Button
                type="submit"
                isLoading={busy}
                loadingText="Verifying…"
                disabled={verifyCode.length < 6}
              >
                Enable 2FA
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Backup codes one-time display */}
      {stage === 'show-codes' && (
        <Card className="space-y-4 p-6 md:p-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Save your backup codes
            </p>
            <p className="text-muted mt-1 max-w-md text-[11px]">
              Store these somewhere safe. Each code works once if you lose access to your
              authenticator. <strong>You won&apos;t see them again.</strong>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((c) => (
              <div
                key={c}
                className="border-border/60 bg-surface rounded border px-3 py-2 text-center"
              >
                {c}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => copy(backupCodes.join('\n'), 'codes')}
              className="text-accent flex items-center gap-1 text-xs hover:underline"
            >
              {copiedCodes ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy all
                </>
              )}
            </button>
            <Button onClick={refreshStatus}>I&apos;ve saved them</Button>
          </div>
        </Card>
      )}

      {/* On — show status + disable/regenerate controls */}
      {stage === 'on' && status && (
        <>
          <Card className="flex items-center justify-between p-6 md:p-8">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Enabled
                <span className="text-muted ml-1 text-[10px] uppercase tracking-wider">
                  {status.method === 'SMS' ? 'SMS' : 'Authenticator'}
                </span>
              </p>
              <p className="text-muted text-[11px]">
                {status.method === 'SMS' && status.phone_hint
                  ? `SMS to ${status.phone_hint} · `
                  : ''}
                {status.backup_codes_remaining} backup code
                {status.backup_codes_remaining === 1 ? '' : 's'} remaining
                {status.verified_at
                  ? ` · enabled ${new Date(status.verified_at).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setStage('disabling')}>
              Disable
            </Button>
          </Card>

          <Card className="space-y-3 p-6 md:p-8">
            <p className="text-sm font-medium">Regenerate backup codes</p>
            <p className="text-muted text-[11px]">
              Invalidates your existing codes and issues a fresh set.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="password"
                placeholder="Current password"
                value={regenPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRegenPassword(e.target.value)
                }
              />
              <Button
                onClick={doRegenerate}
                isLoading={busy}
                loadingText="Regenerating…"
                disabled={!regenPassword}
                className="shrink-0"
              >
                Regenerate
              </Button>
            </div>
          </Card>
        </>
      )}

      {stage === 'disabling' && (
        <Card className="space-y-4 p-6 md:p-8">
          <form onSubmit={doDisable} className="space-y-4">
            <div>
              <p className="text-sm font-medium">Disable 2FA</p>
              <p className="text-muted mt-1 text-[11px]">
                Confirm with your password and a current 6-digit code (or backup code).
              </p>
            </div>
            <Input
              type="password"
              label="Password"
              value={disablePassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDisablePassword(e.target.value)
              }
            />
            <Input
              type="text"
              label="Authenticator or backup code"
              inputMode="numeric"
              value={disableCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisableCode(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setStage('on')}>
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={busy}
                loadingText="Disabling…"
                disabled={!disablePassword || !disableCode}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Disable 2FA
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}
