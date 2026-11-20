export type BlogAudience = 'Sellers' | 'Buyers' | 'Buyers & Sellers';

export interface BlogComparisonTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface BlogSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: Array<{ label: string; text: string }>;
  callout?: {
    eyebrow: string;
    text: string;
    tone?: 'neutral' | 'accent' | 'emerald';
  };
  table?: BlogComparisonTable;
  visual?: 'escrow-flow' | 'fee-split' | 'delivery-network';
}

export interface BlogFaq {
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  rank: number;
  title: string;
  shortTitle: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  audience: BlogAudience;
  readingTime: string;
  publishedAt: string;
  updatedAt: string;
  summary: string;
  keyTakeaways: string[];
  keywords: string[];
  includeFeeCalculator?: boolean;
  heroVisual?: 'escrow-flow' | 'fee-split' | 'delivery-network';
  sections: BlogSection[];
  faqs: BlogFaq[];
  cta: {
    eyebrow: string;
    heading: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
  relatedSlugs: string[];
}
