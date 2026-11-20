'use client';

import React from 'react';
import { ArrowLeft, Palette, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { useTheme } from '@/lib/contexts/theme';

export default function PersonalizationPage() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: 'light' as const,
      name: 'Light Mode',
      icon: Sun,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      id: 'dark' as const,
      name: 'Dark Mode',
      icon: Moon,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

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
        <h2 className="text-md font-medium uppercase tracking-tight">Personalization</h2>
        <p className="text-muted mt-1 text-xs font-medium">
          Customize your Verndly experience and display
        </p>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-muted flex items-center gap-2 px-4 text-[10px] font-normal uppercase tracking-wider">
            <Palette className="h-3 w-3" /> Appearance theme
          </h3>
          <Card className="border-none p-2 shadow-sm" hoverEffect={false}>
            <div className="grid grid-cols-2 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-3 rounded-2xl p-4 transition-all ${
                    theme === t.id
                      ? 'bg-primary text-background shadow-primary/20 scale-[1.02] shadow-lg'
                      : 'bg-surface hover:bg-border/30 text-muted'
                  }`}
                >
                  <t.icon className={`h-5 w-5 ${theme === t.id ? 'text-background' : t.color}`} />
                  <span className="text-[10px] font-normal">{t.name}</span>
                </button>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
