export interface ProductDimensions {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  unit?: 'cm' | 'mm' | 'in' | 'm';
}

export interface ProductWeight {
  value?: number | null;
  unit?: 'kg' | 'g' | 'lb';
}

export interface StructuredProductAttributes {
  subcategory?: string;
  dimensions?: ProductDimensions;
  weight?: ProductWeight;
  color?: string;
  material?: string;
  size?: string;
  warranty?: string;
  sku?: string;
  [key: string]: unknown;
}

export interface CategorySubtabGroup {
  bucket: string;
  categoryTokens: string[];
  subtabs: string[];
}

export const CATEGORY_SUBTAB_GROUPS: CategorySubtabGroup[] = [
  {
    bucket: 'electronics',
    categoryTokens: ['electronic', 'tech', 'gadget', 'computer', 'phone'],
    subtabs: [
      'Phones',
      'Laptops',
      'Tablets',
      'Audio & Headphones',
      'Smartwatches',
      'TVs & Monitors',
      'Cameras & Drones',
      'Gaming',
      'Chargers & Accessories',
    ],
  },
  {
    bucket: 'fashion',
    categoryTokens: ['fashion', 'clothing', 'apparel', 'wear', 'shoes'],
    subtabs: [
      "Women's Dresses",
      "Women's Clothing",
      "Men's Clothing",
      'Shoes',
      'Bags & Handbags',
      'African Wear & Kente',
      'Watches & Accessories',
      'Eyewear & Caps',
      'Sportswear',
    ],
  },
  {
    bucket: 'jewelry & watches',
    categoryTokens: ['jewelry', 'jewellery', 'watch'],
    subtabs: ['Watches', 'Necklaces & Chains', 'Rings', 'Bracelets', 'Earrings', 'Luxury Sets'],
  },
  {
    bucket: 'beauty & personal care',
    categoryTokens: ['beauty', 'personal care', 'skincare', 'cosmetic'],
    subtabs: [
      'Perfumes & Fragrances',
      'Skincare',
      'Hair & Wigs',
      'Makeup',
      'Body Care',
      'Grooming & Shaving',
    ],
  },
  {
    bucket: 'home & kitchen',
    categoryTokens: ['home', 'kitchen', 'living', 'appliance', 'furniture'],
    subtabs: [
      'Kitchen Appliances',
      'Cookware & Dining',
      'Fans & Cooling',
      'Furniture',
      'Bedding & Decor',
      'Storage & Cleaning',
    ],
  },
  {
    bucket: 'health & wellness',
    categoryTokens: ['health', 'wellness', 'medical', 'pharma'],
    subtabs: ['Vitamins & Supplements', 'Medical Devices', 'Fitness Recovery', 'Aromatherapy'],
  },
  {
    bucket: 'sports & outdoors',
    categoryTokens: ['sport', 'outdoor', 'fitness', 'gym'],
    subtabs: ['Gym & Fitness', 'Football & Team Sports', 'Outdoor & Camping', 'Cycling & Mobility'],
  },
  {
    bucket: 'food & beverages',
    categoryTokens: ['food', 'beverage', 'grocery', 'drink', 'snack'],
    subtabs: [
      'Local Staples & Spices',
      'Snacks & Sweets',
      'Coffee & Tea',
      'Drinks & Juices',
      'Oils & Pantry',
    ],
  },
  {
    bucket: 'baby & kids',
    categoryTokens: ['baby', 'kid', 'infant', 'toddler'],
    subtabs: ['Baby Gear & Strollers', 'Diapers & Care', 'Feeding', 'Kids Clothing'],
  },
  {
    bucket: 'books & stationery',
    categoryTokens: ['book', 'stationery'],
    subtabs: ['Books & Novels', 'Textbooks & Study', 'Notebooks & Pens'],
  },
  {
    bucket: 'office supplies',
    categoryTokens: ['office', 'supplies'],
    subtabs: ['Printers & Tech', 'Office Furniture', 'Paper & Filing'],
  },
  {
    bucket: 'toys & games',
    categoryTokens: ['toy', 'game'],
    subtabs: ['Educational Toys', 'Board & Card Games', 'Plush & Dolls'],
  },
  {
    bucket: 'vehicles & parts',
    categoryTokens: ['vehicle', 'auto', 'car', 'part', 'motor'],
    subtabs: ['Car Parts & Tires', 'Car Electronics', 'Motorbikes & Helmets', 'Oils & Care'],
  },
  {
    bucket: 'art & crafts',
    categoryTokens: ['art', 'craft'],
    subtabs: ['Paintings & Wall Art', 'Craft Supplies', 'Handmade & Carvings'],
  },
  {
    bucket: 'services',
    categoryTokens: ['service'],
    subtabs: ['Repairs & Tech', 'Events & Media', 'Home Services'],
  },
];

/** Quick popular subtabs shown when viewing "All" categories on /products */
export const POPULAR_SUBTABS: Array<{ label: string; categoryHint?: string }> = [
  { label: 'Phones', categoryHint: 'Electronics' },
  { label: 'Laptops', categoryHint: 'Electronics' },
  { label: 'Tablets', categoryHint: 'Electronics' },
  { label: "Women's Dresses", categoryHint: 'Fashion' },
  { label: 'Shoes', categoryHint: 'Fashion' },
  { label: 'Watches' },
  { label: 'Perfumes & Fragrances', categoryHint: 'Beauty & Personal Care' },
  { label: 'Bags & Handbags', categoryHint: 'Fashion' },
  { label: 'Audio & Headphones', categoryHint: 'Electronics' },
  { label: 'Kitchen Appliances', categoryHint: 'Home & Kitchen' },
  { label: 'Hair & Wigs', categoryHint: 'Beauty & Personal Care' },
  { label: 'African Wear & Kente', categoryHint: 'Fashion' },
];

export const DIMENSION_UNITS = ['cm', 'mm', 'in', 'm'] as const;
export const WEIGHT_UNITS = ['kg', 'g', 'lb'] as const;
export const WARRANTY_PRESETS = [
  'No Warranty',
  '3-Day Store Guarantee',
  '30-Day Warranty',
  '3-Month Warranty',
  '6-Month Warranty',
  '1-Year Warranty',
  '2-Year Warranty',
] as const;

export function getSubtabsForCategory(categoryName: string | null | undefined): string[] {
  const clean = (categoryName || '').trim().toLowerCase();
  if (!clean) return [];

  const exact = CATEGORY_SUBTAB_GROUPS.find((g) => g.bucket === clean);
  if (exact) return exact.subtabs;

  const partial = CATEGORY_SUBTAB_GROUPS.find((g) =>
    g.categoryTokens.some((tok) => clean.includes(tok)),
  );
  return partial ? partial.subtabs : [];
}

export function buildStructuredAttributes(input: {
  subcategory?: string;
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
  dimensionUnit?: 'cm' | 'mm' | 'in' | 'm';
  weight?: string | number | null;
  weightUnit?: 'kg' | 'g' | 'lb';
  color?: string;
  material?: string;
  size?: string;
  warranty?: string;
  sku?: string;
}): StructuredProductAttributes {
  const out: StructuredProductAttributes = {};

  const sub = input.subcategory?.trim();
  if (sub) out.subcategory = sub;

  const parsePos = (v: string | number | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
    return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : null;
  };

  const l = parsePos(input.length);
  const w = parsePos(input.width);
  const h = parsePos(input.height);
  if (l !== null || w !== null || h !== null) {
    out.dimensions = {
      ...(l !== null ? { length: l } : {}),
      ...(w !== null ? { width: w } : {}),
      ...(h !== null ? { height: h } : {}),
      unit: input.dimensionUnit || 'cm',
    };
  }

  const wt = parsePos(input.weight);
  if (wt !== null) {
    out.weight = {
      value: wt,
      unit: input.weightUnit || 'kg',
    };
  }

  if (input.color?.trim()) out.color = input.color.trim();
  if (input.material?.trim()) out.material = input.material.trim();
  if (input.size?.trim()) out.size = input.size.trim();
  if (input.warranty?.trim()) out.warranty = input.warranty.trim();
  if (input.sku?.trim()) out.sku = input.sku.trim();

  return out;
}

export function formatDimensionsLabel(dimensions?: ProductDimensions | null): string | null {
  if (!dimensions) return null;
  const parts: string[] = [];
  if (dimensions.length) parts.push(`${dimensions.length}`);
  if (dimensions.width) parts.push(`${dimensions.width}`);
  if (dimensions.height) parts.push(`${dimensions.height}`);
  if (parts.length === 0) return null;
  const unit = dimensions.unit || 'cm';
  if (parts.length === 3) {
    return `${dimensions.length} × ${dimensions.width} × ${dimensions.height} ${unit}`;
  }
  const labeled: string[] = [];
  if (dimensions.length) labeled.push(`L ${dimensions.length}`);
  if (dimensions.width) labeled.push(`W ${dimensions.width}`);
  if (dimensions.height) labeled.push(`H ${dimensions.height}`);
  return `${labeled.join(' × ')} ${unit}`;
}

export function formatWeightLabel(weight?: ProductWeight | null): string | null {
  if (!weight || !weight.value) return null;
  return `${weight.value} ${weight.unit || 'kg'}`;
}
