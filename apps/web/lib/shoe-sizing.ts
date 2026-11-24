/**
 * Numeric EU/UK/US shoe-size options for footwear categories and shoe listings (T14: PD-08).
 * Prevents clothing sizes (XS–XL) from appearing on shoe forms.
 */

export const SHOE_SIZE_OPTIONS: readonly string[] = [
  'EU 35 / UK 2.5 / US 5',
  'EU 36 / UK 3.5 / US 6',
  'EU 37 / UK 4 / US 6.5',
  'EU 38 / UK 5 / US 7.5',
  'EU 39 / UK 6 / US 8',
  'EU 40 / UK 6.5 / US 8.5',
  'EU 41 / UK 7.5 / US 9',
  'EU 42 / UK 8 / US 9.5',
  'EU 43 / UK 9 / US 10',
  'EU 44 / UK 9.5 / US 10.5',
  'EU 45 / UK 10.5 / US 11.5',
  'EU 46 / UK 11 / US 12',
  'EU 47 / UK 12 / US 13',
];

const SHOE_CATEGORY_RE =
  /\b(shoe|shoes|footwear|sneaker|sneakers|boot|boots|loafer|loafers|sandal|sandals)\b/i;
const SHOE_TITLE_RE =
  /\b(shoe|shoes|sneaker|sneakers|loafer|loafers|boot|boots|heel|heels|sandal|sandals|slipper|slippers|footwear)\b/i;

export function isShoeListing(category?: string | null, title?: string | null): boolean {
  if (category && SHOE_CATEGORY_RE.test(category)) return true;
  if (title && SHOE_TITLE_RE.test(title)) return true;
  return false;
}

export function resolveSizeFieldOptions(
  category: string | null | undefined,
  defaultOptions: readonly string[] = [],
  title?: string | null,
): string[] {
  if (isShoeListing(category, title)) {
    return [...SHOE_SIZE_OPTIONS];
  }
  return Array.from(new Set(defaultOptions));
}
