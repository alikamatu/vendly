'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import AiNativeHero from './AiNativeHero';
import AiManifestoMetrics from './AiManifestoMetrics';
import AiBentoShowcase from './AiBentoShowcase';
import AiDualJourneySection from './AiDualJourneySection';
import AiLiveMarketplacePulse from './AiLiveMarketplacePulse';
import AiSeoFaqSection from './AiSeoFaqSection';
import AiFinaleCta from './AiFinaleCta';
import SellerExperienceReviews from '@/components/home/SellerExperienceReviews';
import type { PublicSellerExperience } from '@/lib/server-api';
import type { HomepageFaqEntry, HomepageProductPreview, HomepageVendorPreview } from './types';

export type { HomepageFaqEntry, HomepageProductPreview, HomepageVendorPreview };

interface AiNativeHomepageProps {
  featuredProducts: HomepageProductPreview[];
  categories: Array<{ id: string; name: string }>;
  topVendors: HomepageVendorPreview[];
  faqs: HomepageFaqEntry[];
  sellerExperience?: PublicSellerExperience;
}

export default function AiNativeHomepage({
  featuredProducts,
  categories,
  topVendors,
  faqs,
  sellerExperience,
}: AiNativeHomepageProps) {
  return (
    <div className="bg-background text-foreground min-h-screen selection:bg-red-600 selection:text-white">
      <Header />

      <main className="overflow-x-clip">
        <AiNativeHero />
        <AiManifestoMetrics />
        <AiBentoShowcase />
        <AiDualJourneySection />
        <AiLiveMarketplacePulse
          featuredProducts={featuredProducts}
          categories={categories}
          topVendors={topVendors}
        />
        {sellerExperience && sellerExperience.reviews.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
            <SellerExperienceReviews experience={sellerExperience} />
          </section>
        )}
        <AiSeoFaqSection faqs={faqs} />
        <AiFinaleCta />
      </main>
    </div>
  );
}
