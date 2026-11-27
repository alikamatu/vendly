/**
 * Resolve a category image URL.
 * Prefers an admin-provided URL; falls back to a curated Unsplash photo keyed by
 * keywords in the category name so every category has a crisp side thumbnail.
 */
export function resolveCategoryImage(name: string, customUrl?: string | null): string {
  if (customUrl) return customUrl;
  const n = name.toLowerCase();
  if (n.match(/electronic|phone|laptop|gadget|tech|computer/))
    return 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format&fit=crop&q=80';
  if (n.match(/jewelry|jewellery|watch/))
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
  if (n.match(/cloth|wear|fashion|shoe|bag|apparel/))
    return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80';
  if (n.match(/cosmetic|beauty|care|perfume|makeup|skincare/))
    return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=80';
  if (n.match(/home|kitchen|furniture|decor|appliance|living/))
    return 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&auto=format&fit=crop&q=80';
  if (n.match(/health|wellness|medical|pharma/))
    return 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80';
  if (n.match(/sport|outdoor|fitness|gym/))
    return 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&auto=format&fit=crop&q=80';
  if (n.match(/food|drink|snack|grocery|meal|beverage/))
    return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80';
  if (n.match(/baby|kid|infant|toddler/))
    return 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop&q=80';
  if (n.match(/book|study|education|stationery|note/))
    return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80';
  if (n.match(/office|supplies/))
    return 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600&auto=format&fit=crop&q=80';
  if (n.match(/toy|game/))
    return 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&auto=format&fit=crop&q=80';
  if (n.match(/vehicle|auto|car|motor|part/))
    return 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&auto=format&fit=crop&q=80';
  if (n.match(/art|craft|kente/))
    return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80';
  if (n.match(/pet|dog|cat|animal/))
    return 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80';
  if (n.match(/tool|hardware|diy|construction/))
    return 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80';
  if (n.match(/music|instrument|studio|dj/))
    return 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&auto=format&fit=crop&q=80';
  if (n.match(/gift|hamper|flower|party/))
    return 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80';
  if (n.match(/service|job|gig|tutoring/))
    return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
}
