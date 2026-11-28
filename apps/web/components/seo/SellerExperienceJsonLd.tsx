import JsonLd from '@/components/seo/JsonLd';
import { SITE_URL } from '@/lib/seo';
import type { PublicSellerExperience } from '@/lib/server-api';

export default function SellerExperienceJsonLd({
  experience,
}: {
  experience: PublicSellerExperience;
}) {
  if (!experience.reviews.length || experience.count < 1) return null;

  const average = experience.average > 0 ? experience.average : 0;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Verndly',
        url: SITE_URL,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: average.toFixed(1),
          reviewCount: experience.count,
          bestRating: 5,
          worstRating: 1,
        },
        review: experience.reviews.map((review) => ({
          '@type': 'Review',
          author: {
            '@type': 'Organization',
            name: review.store_name,
            url: `${SITE_URL}/s/${review.store_link}`,
          },
          reviewBody: review.body,
          datePublished: review.created_at,
          reviewRating: {
            '@type': 'Rating',
            ratingValue: review.rating,
            bestRating: 5,
            worstRating: 1,
          },
        })),
      }}
    />
  );
}
