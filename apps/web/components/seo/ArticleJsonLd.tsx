import React from 'react';
import JsonLd from './JsonLd';
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';

export interface ArticleJsonLdProps {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt?: string;
  authorName?: string;
  section?: string;
  keywords?: string[];
  image?: string;
}

export default function ArticleJsonLd({
  title,
  description,
  path,
  publishedAt,
  updatedAt,
  authorName = 'Verndly Editorial Team',
  section = 'Marketplace Guides',
  keywords = [],
  image,
}: ArticleJsonLdProps) {
  const url = absoluteUrl(path);
  const imageUrl = image ? absoluteUrl(image) : `${SITE_URL}/opengraph-image`;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        url,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': url,
        },
        datePublished: publishedAt,
        dateModified: updatedAt || publishedAt,
        articleSection: section,
        keywords: keywords.join(', '),
        image: [imageUrl],
        author: {
          '@type': 'Organization',
          name: authorName,
          url: SITE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/logos/verndly.png`,
          },
        },
      }}
    />
  );
}
