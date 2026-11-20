'use client';

import { ArrowLeft, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/lib/contexts/theme';

const THEMES = [
  {
    id: 'light' as const,
    label: 'Light',
    desc: 'Clean white background',
    icon: Sun,
    preview: 'bg-white border-gray-200',
    dot: ['bg-gray-800', 'bg-gray-400', 'bg-gray-300'],
  },
  {
    id: 'dark' as const,
    label: 'Dark',
    desc: 'Easy on the eyes at night',
    icon: Moon,
    preview: 'bg-[#0a0a0a] border-[#262626]',
    dot: ['bg-white', 'bg-gray-500', 'bg-gray-700'],
  },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-16">
      {/* Back */}
      <Link
        href="/account"
        className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight">Appearance</h1>
        <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
          Choose how Verndly looks on your device
        </p>
      </div>

      {/* Theme cards */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
          Theme
        </p>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={[
                  'flex flex-col items-start rounded-3xl border-2 p-4 text-left transition-all duration-150 active:scale-[0.97]',
                  active
                    ? 'bg-[var(--color-accent)]/8 border-[var(--color-accent)]'
                    : 'hover:border-[var(--color-accent)]/40 border-[var(--color-border)] bg-[var(--color-surface)]',
                ].join(' ')}
              >
                {/* Mini preview */}
                <div
                  className={`mb-3 aspect-[4/3] w-full overflow-hidden rounded-2xl border ${t.preview}`}
                >
                  <div className="space-y-1.5 p-2">
                    {t.dot.map((d, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full ${d}`}
                        style={{ width: `${70 - i * 20}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex w-full items-center gap-2">
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-[12px] font-medium ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-foreground)]'}`}
                    >
                      {t.label}
                    </p>
                    <p className="truncate text-[10px] text-[var(--color-muted)]">{t.desc}</p>
                  </div>
                  {active && (
                    <div className="ml-auto flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
