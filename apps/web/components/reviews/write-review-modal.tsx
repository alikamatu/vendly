'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { RatingInput } from './rating-input';

export type WriteReviewSubmit = {
  rating: number;
  title?: string;
  body?: string;
};

export function WriteReviewModal({
  open,
  onClose,
  productTitle,
  initial,
  onSubmit,
  submitting,
  error,
  mode = 'create',
}: {
  open: boolean;
  onClose: () => void;
  productTitle: string;
  initial?: { rating?: number; title?: string; body?: string };
  onSubmit: (v: WriteReviewSubmit) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
  mode?: 'create' | 'edit';
}) {
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);
  const [title, setTitle] = useState<string>(initial?.title ?? '');
  const [body, setBody] = useState<string>(initial?.body ?? '');

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRating(initial?.rating ?? 0);
       
      setTitle(initial?.title ?? '');
       
      setBody(initial?.body ?? '');
    }
  }, [open, initial?.rating, initial?.title, initial?.body]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${mode === 'edit' ? 'Edit' : 'Write'} review`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div className="bg-background relative z-10 w-[min(560px,92vw)] overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <header className="flex items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-foreground text-[17px] font-semibold tracking-tight">
              {mode === 'edit' ? 'Edit your review' : 'Write a review'}
            </h2>
            <p className="text-foreground/60 mt-1 truncate text-[12.5px]">{productTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            tabIndex={-1}
            className="text-foreground/50 hover:bg-foreground/5 hover:text-foreground grid h-8 w-8 place-items-center rounded-md"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </header>

        <div className="space-y-4 px-5 pb-5 pt-4">
          <div>
            <label className="text-foreground/60 mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em]">
              Your rating
            </label>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="text-foreground/60 mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em]">
              Headline <span className="text-foreground/40 font-normal">(optional)</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. "Exactly as described"'
              maxLength={140}
              className="bg-foreground/5 text-foreground block h-10 w-full rounded-lg px-3 text-[13.5px] outline-none focus:ring-2 focus:ring-amber-300/60"
            />
          </div>

          <div>
            <label className="text-foreground/60 mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em]">
              Details <span className="text-foreground/40 font-normal">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="What did you like? What could be better? Future buyers will thank you."
              className="bg-foreground/5 text-foreground block w-full resize-y rounded-lg p-3 text-[13.5px] leading-relaxed outline-none focus:ring-2 focus:ring-amber-300/60"
            />
            <div className="text-foreground/50 mt-1 text-right text-[11px] tabular-nums">
              {body.length}/4000
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-foreground/70 hover:bg-foreground/5 hover:text-foreground inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rating || submitting}
              onClick={() =>
                onSubmit({
                  rating,
                  title: title.trim() || undefined,
                  body: body.trim() || undefined,
                })
              }
              className="inline-flex h-9 items-center rounded-lg bg-amber-400 px-4 text-[13px] font-semibold text-neutral-900 hover:opacity-95 disabled:opacity-50"
            >
              {submitting ? 'Posting…' : mode === 'edit' ? 'Save changes' : 'Post review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
