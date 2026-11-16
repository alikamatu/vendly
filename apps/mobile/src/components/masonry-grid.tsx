import React, { useMemo } from 'react';
import { View } from 'react-native';

import { ProductCard } from '@/components/product-card';
import type { Product } from '@/lib/api';
import { ratioFor } from '@/lib/image-ratio';

/**
 * Two-column masonry, the mobile equivalent of the web's
 * `columns-2 gap-4` product grid. Each card keeps its image's natural
 * height; items go to whichever column is currently shorter.
 */
export function MasonryGrid({
  products,
  gap = 12,
  columns = 2,
}: {
  products: Product[];
  gap?: number;
  columns?: number;
}) {
  const cols = useMemo(() => {
    const buckets: Product[][] = Array.from({ length: columns }, () => []);
    const heights = new Array(columns).fill(0);
    for (const p of products) {
      // Image height relative to width, plus ~0.35 for the text block below.
      const h = ratioFor(p.image_urls?.[0], p.id) + 0.35;
      let target = 0;
      for (let c = 1; c < columns; c++) if (heights[c] < heights[target]) target = c;
      buckets[target]!.push(p);
      heights[target] += h;
    }
    return buckets;
    // Assignment is computed once per product list so cards never hop columns.
  }, [products, columns]);

  return (
    <View style={{ flexDirection: 'row', gap }}>
      {cols.map((col, i) => (
        <View key={i} style={{ flex: 1, gap: 18 }}>
          {col.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </View>
      ))}
    </View>
  );
}
