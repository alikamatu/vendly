'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Clock, ArrowUp } from 'lucide-react';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import VerndlyAiIcon from '@/components/ai/VerndlyAiIcon';

interface VerndlyAiShopBarProps {
  value: string;
  onChange: (v: string) => void;
  onAskAi: (prompt: string) => void;
  isAskingAi: boolean;
  hasAiResult: boolean;
}

const NATURAL_LANGUAGE_HINT =
  /\b(under|below|less than|above|over|between|budget|cheap|affordable|best|gift|for|cedis|ghs|gh₵|sale|discount|deal|deals|new|used|refurbished|student|uni|school|work|office|wedding|birthday)\b/i;

export default function VerndlyAiShopBar({
  value,
  onChange,
  onAskAi,
  isAskingAi,
  hasAiResult,
}: VerndlyAiShopBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { suggest, record, remove, clear } = useSearchHistory();
  const suggestions = suggest(value);

  const trimmed = value.trim();
  const looksLikeAiPrompt =
    trimmed.length >= 6 &&
    (NATURAL_LANGUAGE_HINT.test(trimmed) || trimmed.split(/\s+/).length >= 3);

  // Press "/" to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close recent dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!value || trimmed.length < 2) return;
    const id = window.setTimeout(() => record(trimmed), 900);
    return () => window.clearTimeout(id);
  }, [value, trimmed, record]);

  const pick = (q: string) => {
    onChange(q);
    record(q);
    setOpen(false);
    setActive(-1);
  };

  const triggerAi = () => {
    if (!trimmed || isAskingAi) return;
    record(trimmed);
    setOpen(false);
    onAskAi(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        pick(suggestions[active].q);
        return;
      }
    }
    if (e.key === 'Enter' && looksLikeAiPrompt) {
      e.preventDefault();
      triggerAi();
    }
  };

  return (
    <div className="relative min-w-0 flex-1" ref={wrapRef}>
      <div className="bg-surface flex h-11 items-center gap-2 rounded-2xl px-3 transition-colors">
        <Search className="text-muted h-4 w-4 shrink-0" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search or ask Verndly AI (e.g. gift under GH₵ 300)…"
          className="text-foreground placeholder:text-muted/65 min-w-0 flex-1 bg-transparent text-xs outline-none sm:text-sm"
          autoComplete="off"
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="text-muted hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={triggerAi}
          disabled={!trimmed || isAskingAi}
          title="Ask Verndly AI to shop for this"
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-semibold transition-all disabled:opacity-35 ${
            looksLikeAiPrompt || hasAiResult
              ? 'bg-foreground text-background hover:opacity-90'
              : 'bg-background text-foreground hover:bg-foreground/[0.08]'
          }`}
        >
          <VerndlyAiIcon size={18} mood={isAskingAi ? 'working' : hasAiResult ? 'happy' : 'idle'} />
          <span className="hidden sm:inline">Ask Verndly AI</span>
          <ArrowUp className="h-3 w-3 sm:hidden" />
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="bg-surface absolute left-0 right-0 z-40 mt-1.5 overflow-hidden rounded-2xl p-1.5">
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-muted flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider">
              <Clock className="h-3 w-3" /> Recent
            </span>
            <button
              type="button"
              onClick={() => {
                clear();
                setOpen(false);
              }}
              className="text-muted hover:text-foreground text-[10px] font-medium uppercase tracking-wider"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li key={s.q}>
                <div
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors ${
                    i === active ? 'bg-background' : 'hover:bg-background/70'
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s.q);
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Clock className="text-muted h-3 w-3 shrink-0" />
                    <span className="text-foreground truncate">{s.q}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${s.q}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(s.q);
                    }}
                    className="text-muted hover:text-foreground p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
