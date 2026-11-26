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
import type { HomepageFaqEntry, HomepageProductPreview, HomepageVendorPreview } from './types';

export type { HomepageFaqEntry, HomepageProductPreview, HomepageVendorPreview };

interface AiNativeHomepageProps {
  featuredProducts: HomepageProductPreview[];
  categories: Array<{ id: string; name: string }>;
  topVendors: HomepageVendorPreview[];
  faqs: HomepageFaqEntry[];
}

export default function AiNativeHomepage({
  featuredProducts,
  categories,
  topVendors,
  faqs,
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
        <AiSeoFaqSection faqs={faqs} />
        <AiFinaleCta />
      </main>
    </div>
  );
}
