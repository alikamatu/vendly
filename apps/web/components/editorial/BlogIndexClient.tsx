'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import type { BlogAudience, BlogPost } from '@/lib/content/blog-types';

const AUDIENCE_FILTERS: Array<'All' | BlogAudience> = [
  'All',
  'Sellers',
  'Buyers',
  'Buyers & Sellers',
];

export default function BlogIndexClient({ posts }: { posts: BlogPost[] }) {
  const [audience, setAudience] = useState<'All' | BlogAudience>('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesAudience = audience === 'All' || post.audience === audience;
      const matchesQuery =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        post.eyebrow.toLowerCase().includes(q) ||
        post.keywords.some((k) => k.toLowerCase().includes(q));
      return matchesAudience && matchesQuery;
    });
  }, [posts, audience, query]);

  return (
    <div className="space-y-10">
      {/* Filter & Search Toolbar — zero borders, zero shadows */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {AUDIENCE_FILTERS.map((tab) => {
            const active = audience === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setAudience(tab)}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-surface text-muted hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <label className="relative block w-full md:w-72">
          <Search className="text-muted pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fees, escrow, scams…"
            aria-label="Search guides"
            className="bg-surface text-foreground placeholder:text-muted h-10 w-full rounded-full pl-10 pr-4 text-xs outline-none"
          />
        </label>
      </div>

      {/* Articles Grid */}
      {filtered.length === 0 ? (
        <div className="bg-surface space-y-3 rounded-3xl p-12 text-center">
          <p className="text-foreground text-sm font-medium">No matching guides found.</p>
          <button
            type="button"
            onClick={() => {
              setAudience('All');
              setQuery('');
            }}
            className="bg-foreground text-background cursor-pointer rounded-full px-5 py-2 text-xs font-medium"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="bg-surface hover:bg-foreground/[0.05] group flex flex-col justify-between gap-8 rounded-3xl p-7 transition-colors"
            >
              <div className="space-y-4">
                <div className="text-muted flex items-center justify-between gap-2 font-mono text-[11px]">
                  <span className="truncate">{post.audience}</span>
                  <span className="shrink-0">{post.readingTime}</span>
                </div>

                <h2 className="text-foreground text-lg font-medium leading-snug tracking-tight transition-colors group-hover:text-[var(--color-accent)]">
                  {post.shortTitle}
                </h2>

                <p className="text-muted line-clamp-3 text-xs leading-relaxed">{post.summary}</p>
              </div>

              <div className="text-foreground flex items-center justify-between text-xs font-medium">
                <span>Read guide</span>
                <ArrowUpRight className="text-muted group-hover:text-foreground h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
