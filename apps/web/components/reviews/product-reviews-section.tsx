'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  reviews as api,
  type Review,
  type ReviewSort,
  type ReviewSummary as Summary,
} from '@/lib/api/review';
import { ReviewSummary } from './review-summary';
import { ReviewCard } from './review-card';
import { WriteReviewModal, type WriteReviewSubmit } from './write-review-modal';

type Props = {
  productId: string;
  productTitle: string;
  sellerUserId?: string;
};

const PAGE = 8;

export function ProductReviewsSection({ productId, productTitle, sellerUserId }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [filter, setFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligible, setEligible] = useState<Array<{ id: string }>>([]);
  const [editing, setEditing] = useState<Review | null>(null);
  const [composing, setComposing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const isSeller = Boolean(user && sellerUserId && user.id === sellerUserId);

  /** First reviewable order item for THIS product (used for create button). */
  const firstEligibleItemId = useMemo(() => {
    return eligible[0]?.id ?? null;
  }, [eligible]);

  /** Reviews this user has already written, for "edit" action. */
  const [myWritten, setMyWritten] = useState<Review[]>([]);
  const myReviewForProduct = useMemo(
    () => myWritten.find((r) => r.product_id === productId) ?? null,
    [myWritten, productId],
  );

  const refreshSummary = useCallback(async () => {
    try {
      setSummary((await api.summaryForProduct(productId)).data);
    } catch {
      /* keep prev */
    }
  }, [productId]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (
        await api.listForProduct(productId, {
          limit: PAGE,
          cursor: 0,
          sort,
          rating: filter ?? undefined,
        })
      ).data;
      setItems(res.items);
      setTotal(res.total);
      setCursor(res.nextCursor ?? 0);
      setHasMore(res.nextCursor != null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  }, [productId, sort, filter]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const res = (
        await api.listForProduct(productId, {
          limit: PAGE,
          cursor,
          sort,
          rating: filter ?? undefined,
        })
      ).data;
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor ?? cursor);
      setHasMore(res.nextCursor != null);
    } finally {
      setLoading(false);
    }
  }, [productId, sort, filter, cursor, hasMore, loading]);

  // Initial + dependency-driven loads.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSummary();
  }, [refreshSummary]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEligible([]);
       
      setMyWritten([]);
      return;
    }
    (async () => {
      try {
        const [el, mw] = await Promise.all([api.myEligible(), api.myWritten()]);
        setEligible(el.data.filter((x) => x.product_id === productId));
        setMyWritten(mw.data);
      } catch {
        /* user might be unauthenticated; harmless */
      }
    })();
  }, [user, productId]);

  async function handleSubmit(form: WriteReviewSubmit) {
    setSubmitting(true);
    setComposeError(null);
    try {
      if (editing) {
        await api.update(editing.id, form);
      } else {
        if (!firstEligibleItemId) throw new Error('No eligible purchase to review');
        await api.create({ order_item_id: firstEligibleItemId, ...form });
      }
      setComposing(false);
      setEditing(null);
      await Promise.all([refreshSummary(), loadFirstPage()]);
      // Refresh eligibility (the consumed item should drop out).
      try {
        const [el, mw] = await Promise.all([api.myEligible(), api.myWritten()]);
        setEligible(el.data.filter((x) => x.product_id === productId));
        setMyWritten(mw.data);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : 'Could not save review');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(r: Review) {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    try {
      await api.remove(r.id);
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      setMyWritten((prev) => prev.filter((x) => x.id !== r.id));
      await refreshSummary();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not delete');
    }
  }

  async function handleReply(r: Review, reply: string) {
    const updated = (await api.reply(r.id, reply)).data;
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
  }
  async function handleRemoveReply(r: Review) {
    const updated = (await api.removeReply(r.id)).data;
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x)));
  }
  async function handleFlag(
    r: Review,
    reason: 'SPAM' | 'OFFENSIVE' | 'IRRELEVANT' | 'FAKE' | 'OTHER',
    notes?: string,
  ) {
    try {
      await api.flag(r.id, reason, notes);
      alert('Thanks. Our team will review this report.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not submit report');
    }
  }

  function actorFor(r: Review): 'guest' | 'buyer' | 'seller' {
    if (!user) return 'guest';
    if (r.buyer_id === user.id) return 'buyer';
    if (isSeller) return 'seller';
    return 'guest';
  }

  return (
    <section id="reviews" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-foreground text-[20px] font-semibold tracking-tight">Reviews</h2>
          <p className="text-foreground/60 mt-0.5 text-[12.5px]">
            What other buyers said about this item.
          </p>
        </div>

        {/* CTA: write or edit */}
        {!isSeller &&
          user &&
          (myReviewForProduct ? (
            <button
              type="button"
              onClick={() => {
                setEditing(myReviewForProduct);
                setComposing(true);
              }}
              className="bg-foreground/10 text-foreground hover:bg-foreground/15 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium"
            >
              <Pencil size={13} strokeWidth={2} />
              Edit your review
            </button>
          ) : firstEligibleItemId ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setComposing(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-400 px-3 text-[12.5px] font-semibold text-neutral-900 hover:opacity-95"
            >
              Write a review
            </button>
          ) : (
            <span className="text-foreground/50 text-[11.5px]">
              Buy this product to leave a review
            </span>
          ))}
        {!user && (
          <a
            href="/login"
            className="text-foreground/70 text-[12.5px] font-medium underline-offset-4 hover:underline"
          >
            Sign in to write a review
          </a>
        )}
      </header>

      {summary && (
        <ReviewSummary
          summary={summary}
          activeRating={filter}
          onFilterRating={(n) => setFilter(n)}
        />
      )}

      <div className="flex items-center justify-between">
        <span className="text-foreground/60 text-[12px]">
          {total > 0
            ? `${total.toLocaleString()} review${total === 1 ? '' : 's'}`
            : 'No reviews yet'}
          {filter && (
            <span className="bg-foreground/10 ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]">
              {filter}★ only
              <button
                onClick={() => setFilter(null)}
                className="text-foreground/60 hover:text-foreground"
                aria-label="Clear rating filter"
              >
                ×
              </button>
            </span>
          )}
        </span>
        <SortMenu sort={sort} onChange={setSort} />
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600">{error}</p>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            actor={actorFor(r)}
            onEdit={(rev) => {
              setEditing(rev);
              setComposing(true);
            }}
            onDelete={handleDelete}
            onReply={handleReply}
            onRemoveReply={handleRemoveReply}
            onFlag={handleFlag}
          />
        ))}

        {!loading && items.length === 0 && !error && (
          <div className="bg-foreground/5 rounded-2xl px-4 py-10 text-center">
            <p className="text-foreground/70 text-[13px]">
              No reviews yet — be the first to share your experience.
            </p>
          </div>
        )}

        {hasMore && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="bg-foreground/5 text-foreground hover:bg-foreground/10 inline-flex h-9 items-center rounded-lg px-4 text-[12.5px] font-medium disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Show more'}
            </button>
          </div>
        )}
      </div>

      <WriteReviewModal
        open={composing}
        onClose={() => {
          setComposing(false);
          setEditing(null);
          setComposeError(null);
        }}
        productTitle={productTitle}
        initial={
          editing
            ? { rating: editing.rating, title: editing.title ?? '', body: editing.body ?? '' }
            : undefined
        }
        mode={editing ? 'edit' : 'create'}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={composeError}
      />
    </section>
  );
}

function SortMenu({ sort, onChange }: { sort: ReviewSort; onChange: (s: ReviewSort) => void }) {
  const LABEL: Record<ReviewSort, string> = {
    newest: 'Most recent',
    oldest: 'Oldest',
    highest: 'Highest rated',
    lowest: 'Lowest rated',
    helpful: 'Most helpful',
  };
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-foreground/5 text-foreground/80 hover:bg-foreground/10 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px]"
      >
        {LABEL[sort]}
        <ChevronDown size={12} strokeWidth={2} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30"
          />
          <ul
            role="menu"
            className="bg-background ring-foreground/10 absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-lg p-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,.45)] ring-1"
          >
            {(Object.keys(LABEL) as ReviewSort[]).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={`hover:bg-foreground/5 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px] ${sort === s ? 'text-foreground' : 'text-foreground/70'}`}
                >
                  {LABEL[s]}
                  {sort === s && <span className="text-amber-400">●</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
