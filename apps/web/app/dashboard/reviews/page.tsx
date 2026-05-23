'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  reviews as api,
  type Review,
  type ReviewSort,
  type ReviewSummary as Summary,
} from '@/lib/api/review';
import { RatingStars } from '@/components/reviews/rating-stars';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import {
  Star,
  MessageSquare,
  Trash2,
  Pencil,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_LIMIT = 8;

function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);

  let result = '';
  if (diffSecs < 60) {
    result = 'just now';
  } else if (diffMins < 60) {
    result = `${diffMins}m`;
  } else if (diffHours < 24) {
    result = `${diffHours}h`;
  } else if (diffDays < 30) {
    result = `${diffDays}d`;
  } else if (diffMonths < 12) {
    result = `${diffMonths}mo`;
  } else {
    result = `${diffYears}y`;
  }

  if (options?.addSuffix && result !== 'just now') {
    return `${result} ago`;
  }
  return result;
}

export default function SellerReviewsDashboardPage() {
  const { user } = useAuth();
  const storeLink = user?.seller_profile?.store_link;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [sort, setSort] = useState<ReviewSort>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // Direct reply editing states
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchSummary = useCallback(async () => {
    if (!storeLink) return;
    try {
      const res = await api.summaryForStore(storeLink);
      setSummary(res.data);
    } catch {
      // ignore
    }
  }, [storeLink]);

  const fetchReviews = useCallback(
    async (isLoadMore = false) => {
      if (!storeLink) return;
      if (!isLoadMore) setLoading(true);

      try {
        const currentCursor = isLoadMore ? cursor : 0;
        const res = await api.listForStore(storeLink, {
          limit: PAGE_LIMIT,
          cursor: currentCursor,
          sort,
          rating: filterRating ?? undefined,
        });

        if (isLoadMore) {
          setReviews((prev) => [...prev, ...res.data.items]);
        } else {
          setReviews(res.data.items);
        }
        setTotal(res.data.total);
        setCursor(res.data.nextCursor ?? 0);
        setHasMore(res.data.nextCursor != null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        toast.error(err.message || 'Failed to fetch reviews');
      } finally {
        setLoading(false);
      }
    },
    [storeLink, sort, filterRating, cursor],
  );

  useEffect(() => {
    if (storeLink) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSummary();
       
      fetchReviews(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeLink, sort, filterRating, fetchSummary]); // Skip fetchReviews dependency here to prevent double triggering

  const handlePostReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReplyId(reviewId);
    try {
      await api.reply(reviewId, replyText.trim());
      toast.success('Response posted successfully');
      setActiveReplyId(null);
      setReplyText('');
      // Reload matching review item in state
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, seller_reply: replyText.trim(), seller_replied_at: new Date().toISOString() }
            : r,
        ),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Failed to post response');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (!confirm('Delete your response? This cannot be undone.')) return;
    setSubmittingReplyId(reviewId);
    try {
      await api.removeReply(reviewId);
      toast.success('Response deleted');
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, seller_reply: null, seller_replied_at: null } : r,
        ),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete response');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  if (!storeLink) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-medium uppercase tracking-tight">No Store Found</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          You need to complete your onboarding profile setup before you can access the seller
          dashboard reviews feature.
        </p>
        <Link href="/create-store" className="block">
          <Button variant="primary" className="w-full">
            Set Up Store
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate percentages for distribution bars
  const distributionList = summary
    ? ([
        { stars: 5, count: summary.distribution[5] },
        { stars: 4, count: summary.distribution[4] },
        { stars: 3, count: summary.distribution[3] },
        { stars: 2, count: summary.distribution[2] },
        { stars: 1, count: summary.distribution[1] },
      ] as Array<{ stars: 5 | 4 | 3 | 2 | 1; count: number }>)
    : [];

  return (
    <div className="space-y-8 pb-16">
      {/* Analytics Summary */}
      {summary && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Main Average Rating */}
          <Card
            className="border-border/50 flex flex-col justify-between rounded-3xl border p-6"
            hoverEffect={false}
          >
            <div>
              <p className="text-muted mb-2 text-[10px] font-medium uppercase tracking-wider">
                Overall Store Rating
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-4xl font-semibold tracking-tight">
                  {summary.average.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-xs font-normal">/ 5.0</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-1.5">
                <RatingStars value={summary.average} size={16} />
                <span className="text-muted-foreground text-xs font-normal">
                  ({summary.count} reviews)
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] font-normal">
                Direct customer reviews left on your store listings.
              </p>
            </div>
          </Card>

          {/* Review Stats */}
          <Card
            className="border-border/50 flex flex-col justify-between rounded-3xl border p-6"
            hoverEffect={false}
          >
            <div>
              <p className="text-muted mb-2 text-[10px] font-medium uppercase tracking-wider">
                Social Proof Strength
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-4xl font-semibold tracking-tight">
                  {summary.count}
                </span>
                <span className="text-muted-foreground text-xs font-normal">Responses</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-normal">
                  {summary.average >= 4.5
                    ? 'Excellent Rating Level'
                    : summary.average >= 4.0
                      ? 'Healthy Rating Level'
                      : 'Requires Improvement'}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] font-normal">
                High ratings improve your ranking in the global Stores directory!
              </p>
            </div>
          </Card>

          {/* Star Distribution */}
          <Card className="border-border/50 rounded-3xl border p-6" hoverEffect={false}>
            <p className="text-muted mb-4 text-[10px] font-medium uppercase tracking-wider">
              Rating Distribution
            </p>
            <div className="space-y-2.5">
              {distributionList.map((item) => {
                const percent = summary.count > 0 ? (item.count / summary.count) * 100 : 0;
                return (
                  <div key={item.stars} className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() =>
                        setFilterRating(filterRating === item.stars ? null : item.stars)
                      }
                      className={`hover:text-primary w-8 text-left text-[11px] font-medium transition-colors ${filterRating === item.stars ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
                    >
                      {item.stars} ★
                    </button>
                    <div className="bg-surface border-border/40 relative h-2 flex-1 overflow-hidden rounded-full border">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-6 text-right text-[10px] tabular-nums">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <div className="border-border/40 flex flex-col items-start justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        {/* Rating Pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterRating(null)}
            className={`h-8 rounded-full border px-4 text-[11px] font-medium uppercase tracking-wider transition-all ${
              filterRating === null
                ? 'bg-foreground text-background border-foreground'
                : 'bg-surface text-muted-foreground border-border hover:bg-border/20 hover:text-foreground'
            }`}
          >
            All Reviews
          </button>
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              onClick={() => setFilterRating(stars)}
              className={`flex h-8 items-center gap-1.5 rounded-full border px-4 text-[11px] font-medium uppercase tracking-wider transition-all ${
                filterRating === stars
                  ? 'border-amber-400 bg-amber-400 font-semibold text-neutral-900'
                  : 'bg-surface text-muted-foreground border-border hover:bg-border/20 hover:text-foreground'
              }`}
            >
              {stars} ★
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <span className="text-muted whitespace-nowrap text-[10px] font-medium uppercase tracking-wider">
            Sort By
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ReviewSort)}
            className="border-border bg-surface text-foreground focus:border-primary/50 h-9 w-full cursor-pointer rounded-xl border px-4 text-[11px] font-normal outline-none transition-colors sm:w-auto"
          >
            <option value="newest">Most Recent</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Review Feed */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Spinner size="lg" />
          <p className="text-muted-foreground text-xs font-normal uppercase tracking-wider">
            Syncing feed...
          </p>
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {reviews.map((r, idx) => {
              const author = r.buyer?.full_name || 'Anonymous Buyer';
              const ago = formatDistanceToNow(new Date(r.created_at), { addSuffix: true });
              const isReplyingActive = activeReplyId === r.id;

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="border-border/50 bg-surface/30 rounded-3xl border p-5 sm:p-6"
                >
                  <header className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-foreground/5 text-foreground/60 grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold uppercase">
                        {author.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground text-[13px] font-medium">{author}</span>
                          {r.verified_purchase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              <Award size={10} />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <RatingStars value={r.rating} size={11} />
                          <span className="text-muted-foreground text-[10px] font-normal">
                            {ago}
                            {r.edited_at ? ' • edited' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {!r.seller_reply && !isReplyingActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActiveReplyId(r.id);
                            setReplyText('');
                          }}
                          className="border-border/40 hover:bg-surface/50 h-8 rounded-xl border px-3 text-[9px] font-medium uppercase tracking-wider"
                        >
                          <MessageSquare className="text-primary mr-1 h-3.5 w-3.5" />
                          Reply
                        </Button>
                      )}

                      {r.seller_reply && !isReplyingActive && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setActiveReplyId(r.id);
                              setReplyText(r.seller_reply || '');
                            }}
                            className="text-muted-foreground hover:text-foreground p-2 transition-colors"
                            title="Edit response"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReply(r.id)}
                            disabled={submittingReplyId === r.id}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
                            title="Delete response"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </header>

                  {/* Review Content */}
                  <div className="mt-4 space-y-1.5">
                    {r.title && (
                      <h4 className="text-foreground text-[13px] font-semibold">{r.title}</h4>
                    )}
                    {r.body && (
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs font-medium leading-relaxed">
                        {r.body}
                      </p>
                    )}
                  </div>

                  {/* Purchased product reference */}
                  {r.product && (
                    <div className="text-muted-foreground border-border/30 mt-4 inline-flex w-full items-center gap-1.5 border-t pt-3 text-[10px]">
                      <span>Purchased:</span>
                      <Link
                        href={`/product/${r.product.id}`}
                        target="_blank"
                        className="text-foreground hover:text-primary inline-flex max-w-[70%] items-center gap-1 truncate font-medium uppercase tracking-tight transition-colors"
                      >
                        {r.product.title}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                  )}

                  {/* Seller response block */}
                  {(r.seller_reply || isReplyingActive) && (
                    <div className="bg-surface/50 border-border/40 relative mt-4 overflow-hidden rounded-2xl border p-4 transition-all duration-300">
                      <div className="text-muted mb-2 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider">
                        <MessageSquare size={10} className="text-primary" />
                        Your Store Response
                      </div>

                      {isReplyingActive ? (
                        <div className="space-y-3">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            placeholder="Type your response on behalf of your brand..."
                            className="border-border bg-background text-foreground focus:border-primary/50 block w-full resize-none rounded-xl border p-3 text-xs leading-relaxed outline-none transition-colors"
                          />
                          <div className="flex justify-end gap-2 text-[10px]">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setActiveReplyId(null);
                                setReplyText('');
                              }}
                              className="h-8 px-3 text-[9px] font-medium uppercase tracking-wider"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={!replyText.trim() || submittingReplyId === r.id}
                              onClick={() => handlePostReply(r.id)}
                              className="h-8 rounded-xl px-4 text-[9px] font-medium uppercase tracking-wider"
                            >
                              {submittingReplyId === r.id ? 'Posting...' : 'Save Response'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-foreground/90 whitespace-pre-wrap text-xs font-medium leading-relaxed">
                            {r.seller_reply}
                          </p>
                          {r.seller_replied_at && (
                            <div className="text-muted mt-2 text-[9px] font-normal uppercase tracking-wider">
                              Replied{' '}
                              {formatDistanceToNow(new Date(r.seller_replied_at), {
                                addSuffix: true,
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-6 text-center">
              <Button
                variant="secondary"
                onClick={() => fetchReviews(true)}
                disabled={loading}
                className="h-11 rounded-full px-8 text-[10px] font-medium uppercase tracking-wider"
              >
                {loading ? 'Loading...' : 'Load More Reviews'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="border-border/50 bg-surface/10 space-y-4 rounded-[2.5rem] border border-dashed py-20 text-center">
          <MessageSquare className="text-muted mx-auto h-12 w-12 opacity-10" />
          <div className="space-y-1">
            <p className="text-muted text-[11px] font-medium uppercase tracking-wider">
              No reviews matching filter
            </p>
            <p className="text-muted/60 text-[9px] font-medium uppercase italic tracking-wider">
              When customers leave reviews on your products, they will appear here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
