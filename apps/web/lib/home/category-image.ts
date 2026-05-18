/**
 * Resolve a category image URL.
 * Prefers an admin-provided URL; falls back to a curated Unsplash photo keyed by
 * keywords in the category name.
 */
export function resolveCategoryImage(name: string, customUrl?: string | null): string {
  if (customUrl) return customUrl;
  const n = name.toLowerCase();
  if (n.match(/electronic|phone|laptop|gadget/))
    return "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format&fit=crop&q=80";
  if (n.match(/cloth|wear|fashion|shoe|bag/))
    return "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80";
  if (n.match(/book|study|education|note/))
    return "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80";
  if (n.match(/home|furniture|decor|appliance/))
    return "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&auto=format&fit=crop&q=80";
  if (n.match(/cosmetic|beauty|care|perfume|makeup/))
    return "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=80";
  if (n.match(/food|drink|snack|grocery|meal/))
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80";
  if (n.match(/service|job|gig|tutoring/))
    return "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80";
  return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";
}
