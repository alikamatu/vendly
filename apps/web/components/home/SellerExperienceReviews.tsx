'use client';

import Link from 'next/link';
import { RatingStars } from '@/components/reviews/rating-stars';
import type { PublicSellerExperience } from '@/lib/server-api';

export default function SellerExperienceReviews({
  experience,
}: {
  experience: PublicSellerExperience;
}) {
  if (!experience.reviews.length) return null;

  const averageLabel = experience.average > 0 ? `${experience.average.toFixed(1)} out of 5` : null;

  return (
    <section aria-label="Verified seller reviews" className="space-y-8">
      <div className="max-w-2xl space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Verified seller reviews
        </p>
        <h2 className="text-foreground text-3xl font-medium tracking-tight md:text-4xl">
          Stores on Verndly, in their own words.
        </h2>
        <p className="text-muted text-sm leading-relaxed md:text-base">
          These reviews come from sellers who listed more than five products. Verndly checks each
          one before it appears here
          {averageLabel ? `, and the published set averages ${averageLabel}` : ''}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {experience.reviews.map((review) => (
          <figure
            key={review.id}
            className="bg-surface flex h-full flex-col justify-between gap-6 rounded-3xl p-7"
          >
            <blockquote className="text-foreground text-sm leading-relaxed">
              “{review.body}”
            </blockquote>
            <figcaption className="flex items-center gap-3">
              <span className="bg-background text-foreground flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-semibold">
                {review.logo_url ? (
                  <img src={review.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  review.store_name.slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="min-w-0">
                <Link
                  href={`/s/${review.store_link}`}
                  className="text-foreground block truncate text-sm font-semibold"
                >
                  {review.store_name}
                </Link>
                <RatingStars value={review.rating} size={12} className="mt-1" />
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
