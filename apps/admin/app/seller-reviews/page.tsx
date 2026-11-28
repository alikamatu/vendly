'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MessageSquare, Search, Star, XCircle } from 'lucide-react';
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
import { dateTime } from '@/lib/format';
import {
  VendlySellerExperienceService,
  type SellerExperienceReview,
  type SellerExperienceStatus,
} from '@/services/seller-experience.service';
import { useToast } from '@/contexts/ToastContext';

const STATUS_BADGE: Record<SellerExperienceStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
};

export default function SellerReviewsPage() {
  const [reviews, setReviews] = useState<SellerExperienceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      setReviews(await VendlySellerExperienceService.list());
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const moderate = async (id: string, status: 'PUBLISHED' | 'REJECTED') => {
    setBusyId(id);
    try {
      await VendlySellerExperienceService.moderate(id, status);
      success(status === 'PUBLISHED' ? 'Review published on the homepage' : 'Review rejected');
      await fetchReviews();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not update this review');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = reviews.filter((review) => {
    const q = search.toLowerCase();
    return (
      !q ||
      review.store_name.toLowerCase().includes(q) ||
      review.body.toLowerCase().includes(q) ||
      review.store_link.toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
            Seller experience reviews
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            Reviews from stores that listed more than five products. Publish one to show the store
            name and logo on the homepage.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
          <Input
            placeholder="Search store or review..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading seller reviews...</p>
          </div>
        ) : filtered.length === 0 ? (
          <TableEmpty
            icon={MessageSquare}
            title="No seller reviews yet"
            description="Stores see this prompt after they upload more than five products."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Store</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-semibold">
                        {review.logo_url ? (
                          <img
                            src={review.logo_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          review.store_name.slice(0, 1).toUpperCase()
                        )}
                      </span>
                      <span>
                        <p className="text-foreground font-medium">{review.store_name}</p>
                        <p className="text-muted-foreground text-[10px]">/{review.store_link}</p>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span className="text-foreground text-xs font-semibold">{review.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground max-w-[320px] text-xs">
                    <p className="line-clamp-3">{review.body}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[review.status]} dot>
                      {review.status === 'PUBLISHED'
                        ? 'Published'
                        : review.status === 'REJECTED'
                          ? 'Rejected'
                          : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {dateTime(review.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {review.status !== 'PUBLISHED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === review.id}
                          onClick={() => void moderate(review.id, 'PUBLISHED')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Publish
                        </Button>
                      )}
                      {review.status !== 'REJECTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === review.id}
                          onClick={() => void moderate(review.id, 'REJECTED')}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      )}
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
