'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { RatingInput } from '@/components/reviews/rating-input';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/auth-context';

const MotionDiv = motion.div as any;

const DONE_KEY = 'vendly_seller_experience_done';

function markDoneLocally() {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    // Private mode can block storage; the server flag still stops the next session.
  }
}

function alreadyDoneLocally() {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function SellerExperiencePrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const sellerId = user?.seller_profile?.id;

  useEffect(() => {
    if (!sellerId || alreadyDoneLocally()) return;
    let cancelled = false;
    api
      .get<{ should_prompt: boolean }>('/seller-experience/prompt')
      .then((res) => {
        if (!cancelled && res.data?.should_prompt) setOpen(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const dismiss = useCallback(() => {
    markDoneLocally();
    setOpen(false);
    api.post('/seller-experience/dismiss').catch(() => undefined);
  }, []);

  const submit = async () => {
    if (rating < 1) {
      toast.error('Choose a rating from 1 to 5.');
      return;
    }
    const text = body.trim();
    if (text.length < 20) {
      toast.error('Write at least a short note about selling on Verndly.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/seller-experience', { rating, body: text });
      markDoneLocally();
      setOpen(false);
      toast.success('Thanks. Your review will appear after Verndly checks it.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your review.';
      if (/already responded/i.test(message)) {
        markDoneLocally();
        setOpen(false);
        return;
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onTap={dismiss}
            className="absolute inset-0 bg-black/60"
          />
          <MotionDiv
            role="dialog"
            aria-labelledby="seller-experience-title"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-2xl sm:p-6 dark:border-zinc-800 dark:bg-[#18181b]"
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Seller review
            </p>
            <h2
              id="seller-experience-title"
              className="mt-1 pr-8 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              How has selling on Verndly been?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              You have listed more than 5 products. A short rating helps other stores, and Verndly
              checks it before it goes on the homepage.
            </p>
            <div className="mt-4">
              <RatingInput value={rating} onChange={setRating} />
            </div>
            <label className="mt-4 block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              Your experience
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                maxLength={800}
                placeholder="What has listing and selling on Verndly been like for your store?"
                className="mt-1.5 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 rounded-2xl border border-zinc-200 py-3 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving}
                className="flex-[1.5] rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {saving ? 'Saving...' : 'Submit review'}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
}
