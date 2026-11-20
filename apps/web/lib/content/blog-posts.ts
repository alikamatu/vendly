import { CORE_BLOG_POSTS } from './blog-posts-core';
import { EXTENDED_BLOG_POSTS } from './blog-posts-extended';
import type { BlogPost } from './blog-types';

export type {
  BlogPost,
  BlogAudience,
  BlogSection,
  BlogFaq,
  BlogComparisonTable,
} from './blog-types';

export const ALL_BLOG_POSTS: BlogPost[] = [...CORE_BLOG_POSTS, ...EXTENDED_BLOG_POSTS].sort(
  (a, b) => a.rank - b.rank,
);

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return ALL_BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRelatedBlogPosts(post: BlogPost): BlogPost[] {
  const bySlug = post.relatedSlugs
    .map((slug) => getBlogPostBySlug(slug))
    .filter((p): p is BlogPost => Boolean(p));
  if (bySlug.length >= 3) return bySlug.slice(0, 3);
  const fallback = ALL_BLOG_POSTS.filter(
    (p) => p.slug !== post.slug && !bySlug.some((existing) => existing.slug === p.slug),
  );
  return [...bySlug, ...fallback].slice(0, 3);
}
