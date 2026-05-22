"use client";

import { ArrowLeft, Sun, Moon, Monitor } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/contexts/theme";

const THEMES = [
  {
    id: "light" as const,
    label: "Light",
    desc: "Clean white background",
    icon: Sun,
    preview: "bg-white border-gray-200",
    dot: ["bg-gray-800", "bg-gray-400", "bg-gray-300"],
  },
  {
    id: "dark" as const,
    label: "Dark",
    desc: "Easy on the eyes at night",
    icon: Moon,
    preview: "bg-[#0a0a0a] border-[#262626]",
    dot: ["bg-white", "bg-gray-500", "bg-gray-700"],
  },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-16">
      {/* Back */}
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)] uppercase tracking-wider transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div>
        <h1 className="text-lg font-medium tracking-tight">Appearance</h1>
        <p className="text-[11px] text-[var(--color-muted)] mt-0.5">Choose how Vendly looks on your device</p>
      </div>

      {/* Theme cards */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-medium text-[var(--color-muted)] uppercase tracking-wider">Theme</p>
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
                  "flex flex-col items-start p-4 rounded-3xl border-2 transition-all duration-150 text-left active:scale-[0.97]",
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/8"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40",
                ].join(" ")}
              >
                {/* Mini preview */}
                <div className={`w-full aspect-[4/3] rounded-2xl border mb-3 overflow-hidden ${t.preview}`}>
                  <div className="p-2 space-y-1.5">
                    {t.dot.map((d, i) => (
                      <div key={i} className={`h-1.5 rounded-full ${d}`} style={{ width: `${70 - i * 20}%` }} />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}`} />
                  <div className="min-w-0">
                    <p className={`text-[12px] font-medium ${active ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]"}`}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted)] truncate">{t.desc}</p>
                  </div>
                  {active && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coming soon */}
      <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4 flex items-center gap-3 opacity-50">
        <div className="w-9 h-9 rounded-2xl bg-[var(--color-border)]/50 flex items-center justify-center flex-shrink-0">
          <Monitor className="w-4 h-4 text-[var(--color-muted)]" />
        </div>
        <div>
          <p className="text-[12px] font-normal text-[var(--color-foreground)]">System Sync</p>
          <p className="text-[11px] text-[var(--color-muted)]">Follow device dark mode — coming soon</p>
        </div>
      </div>
    </div>
  );
}
