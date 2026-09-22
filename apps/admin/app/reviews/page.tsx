'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Star,
  EyeOff,
  Eye,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { dateTime, shortId } from '@/lib/format';
import { VendlyReviewsService, type ReviewModerationAction } from '@/services/reviews.service';
import type { Review } from '@/types/operations';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await VendlyReviewsService.list();
      setReviews(res.data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const handleModerate = async (id: string, action: ReviewModerationAction) => {
    if (action === 'delete') {
      const ok = await confirm({
        title: 'Delete Customer Review',
        description:
          'Are you sure you want to permanently delete this customer review? This will remove it from the product page and merchant rating statistics.',
        confirmText: 'Delete Review',
        variant: 'danger',
        icon: 'trash',
      });
      if (!ok) return;
    }
    setActionLoading(true);
    try {
      await VendlyReviewsService.moderate(id, action);
      success(`Review ${action.replace('_', ' ')} applied`);
      await fetchReviews();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.comment?.toLowerCase().includes(q) ||
      r.user?.full_name?.toLowerCase().includes(q) ||
      r.product?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Review Moderation
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Inspect user comments, moderate flagged content, and maintain authentic community
              feedback.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <Input
            placeholder="Search review comment, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading reviews...</p>
          </div>
        ) : filtered.length === 0 ? (
          <TableEmpty
            icon={MessageSquare}
            title="No reviews found"
            description="No reviews found under your current search filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Author</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Flag Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="text-foreground font-medium">{r.user?.full_name || 'Customer'}</p>
                    {r.is_verified_purchase && (
                      <span className="text-[10px] font-semibold text-emerald-500">
                        Verified Purchase
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground max-w-[150px] truncate text-xs">
                    {r.product?.title || 'Product'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span className="text-foreground text-xs font-semibold">{r.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground max-w-[280px] text-xs">
                    <p className="line-clamp-2">{r.comment}</p>
                  </TableCell>
                  <TableCell>
                    {r.is_flagged ? (
                      <Badge variant="danger" dot>
                        Flagged
                      </Badge>
                    ) : r.is_hidden ? (
                      <Badge variant="warning" dot>
                        Hidden
                      </Badge>
                    ) : (
                      <Badge variant="success" dot>
                        Visible
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {dateTime(r.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {r.is_flagged && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => handleModerate(r.id, 'dismiss_flags')}
                          className="h-7 px-2 text-xs text-blue-500 hover:bg-blue-500/10"
                          title="Dismiss flags"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Dismiss
                        </Button>
                      )}
                      {r.is_hidden ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => handleModerate(r.id, 'show')}
                          className="h-7 px-2 text-xs text-emerald-500 hover:bg-emerald-500/10"
                          title="Show review"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Show
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading}
                          onClick={() => handleModerate(r.id, 'hide')}
                          className="h-7 px-2 text-xs text-amber-500 hover:bg-amber-500/10"
                          title="Hide review"
                        >
                          <EyeOff className="mr-1 h-3 w-3" />
                          Hide
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => handleModerate(r.id, 'delete')}
                        className="h-7 px-2 text-xs text-rose-500 hover:bg-rose-500/10"
                        title="Delete review"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminShell>
  );
}
