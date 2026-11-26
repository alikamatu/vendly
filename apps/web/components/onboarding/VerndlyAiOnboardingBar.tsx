'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Check, Globe, MessageSquare, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';
import VerndlyAiOverlay from '@/components/ai/VerndlyAiOverlay';
import Alert from '@/components/ui/Alert';
import { aiApi, type AiOnboardingAssistantResult } from '@/lib/api/ai';

const SPRING_TAB = { type: 'spring' as const, stiffness: 420, damping: 34 };

const EXAMPLE_PROMPTS = [
  {
    label: 'Fashion in Accra',
    text: 'We sell thrift sneakers, hoodies, and bags in East Legon, Accra with same-day Accra delivery and nationwide VIP bus shipping.',
  },
  {
    label: 'Tech & Gadgets',
    text: 'Tested laptops, iPhones, and accessories in Circle, Accra. Next-day nationwide courier delivery.',
  },
  {
    label: 'Beauty & Skincare',
    text: 'Raw northern shea butter, body oils, and perfumes in Kumasi with 24–48hr delivery across Ghana.',
  },
];

interface VerndlyAiOnboardingBarProps {
  token: string;
  currentStoreName: string;
  onApply: (draft: AiOnboardingAssistantResult) => void;
}

export default function VerndlyAiOnboardingBar({
  token,
  currentStoreName,
  onApply,
}: VerndlyAiOnboardingBarProps) {
  const [mode, setMode] = useState<'prompt' | 'website'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedResult, setAppliedResult] = useState<AiOnboardingAssistantResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const runAssistant = async (overridePrompt?: string) => {
    const cleanPrompt = (overridePrompt ?? prompt).trim();
    const cleanUrl = websiteUrl.trim();

    if (mode === 'prompt' && !cleanPrompt) {
      toast.info('Describe what you sell and where you are based in one sentence.');
      return;
    }
    if (mode === 'website' && !cleanUrl) {
      toast.info('Paste your existing website URL first.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    try {
      const result = await aiApi.onboardingAssistant(token, {
        prompt: mode === 'prompt' ? cleanPrompt : undefined,
        website_url: mode === 'website' ? cleanUrl : undefined,
        store_name: currentStoreName.trim() || undefined,
      });
      setAppliedResult(result);
      setIsExpanded(false);
      onApply(result);
      toast.success('Verndly AI configured your store identity, location & shipping!');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Verndly AI could not generate your setup right now.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runAssistant();
  };

  return (
    <>
      <VerndlyAiOverlay
        isOpen={isGenerating}
        messages={[
          mode === 'website'
            ? 'Reading your website brand & store details…'
            : 'Understanding what you sell and where you operate…',
          'Drafting your storefront bio, business hours & delivery policy…',
          'Matching your Ghana city, coverage radius & escrow settings…',
        ]}
        subtitle="Verndly AI Onboarding Assistant"
      />

      <div className="bg-surface rounded-3xl p-5 sm:p-6">
        {!isExpanded && appliedResult ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <VerndlyAiIcon size={22} mood="happy" animated={false} />
                <div>
                  <p className="text-foreground flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Pre-filled by Verndly AI</span>
                  </p>
                  <p className="text-muted text-[11px]">
                    Brand profile
                    {appliedResult.matched_location
                      ? `, ${appliedResult.matched_location.city}`
                      : ''}{' '}
                    &amp; shipping speed ready — review below.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="bg-background text-foreground hover:bg-foreground/[0.06] inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Refine with AI</span>
              </button>
            </div>

            {appliedResult.onboarding_tip && (
              <p className="bg-background text-muted rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed">
                <strong className="text-foreground font-semibold">Tip:</strong>{' '}
                {appliedResult.onboarding_tip}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <VerndlyAiIcon size={24} />
                <div>
                  <h2 className="text-foreground text-sm font-semibold tracking-tight">
                    Set up in 10 seconds with Verndly AI
                  </h2>
                  <p className="text-muted text-[11px]">
                    Auto-fills your name, handle, bio, hours, Ghana city &amp; delivery speed.
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="bg-background inline-flex self-start rounded-full p-1">
                {(
                  [
                    { id: 'prompt', label: 'Describe Business', Icon: MessageSquare },
                    { id: 'website', label: 'From Website', Icon: Globe },
                  ] as const
                ).map((tab) => {
                  const active = mode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setMode(tab.id);
                        setError(null);
                      }}
                      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        active ? 'text-background' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="onboarding-ai-mode-pill"
                          transition={SPRING_TAB}
                          className="bg-foreground absolute inset-0 rounded-full"
                        />
                      )}
                      <tab.Icon className="relative z-10 h-3 w-3" />
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'prompt' ? (
                <>
                  <div className="bg-background flex items-center gap-2 rounded-2xl p-2 pl-4">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. Thrift sneakers & hoodies in East Legon, Accra — same-day delivery…"
                      className="text-foreground placeholder:text-muted/65 min-w-0 flex-1 bg-transparent py-1.5 text-xs outline-none sm:text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!prompt.trim() || isGenerating}
                      className="bg-foreground text-background inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-35"
                    >
                      <span>Auto-Fill</span>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted mr-0.5 text-[10px] font-medium">Examples:</span>
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button
                        key={ex.label}
                        type="button"
                        onClick={() => {
                          setPrompt(ex.text);
                          void runAssistant(ex.text);
                        }}
                        className="bg-background text-foreground hover:bg-foreground hover:text-background rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-background flex items-center gap-2 rounded-2xl p-2 pl-4">
                  <Globe className="text-muted h-4 w-4 shrink-0" />
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourstore.com"
                    className="text-foreground placeholder:text-muted/65 min-w-0 flex-1 bg-transparent py-1.5 text-xs outline-none sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!websiteUrl.trim() || isGenerating}
                    className="bg-foreground text-background inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-35"
                  >
                    <span>Import Brand</span>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </>
  );
}
