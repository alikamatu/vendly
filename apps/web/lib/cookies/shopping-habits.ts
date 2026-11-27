/**
 * Cookie-backed Shopping Habits Learning Engine for Verndly.
 *
 * Stores a compact, anonymous preference profile in first-party cookies:
 *  - `verndly_cookie_consent`: 'accepted' | 'essential'
 *  - `verndly_shopping_habits`: weighted affinity scores for categories, subcategories,
 *    brands, tags/keywords, recently viewed product IDs, and comfortable price band.
 *
 * Privacy-first:
 *  - Contains ZERO PII (no name, email, phone, or user ID).
 *  - Respects explicit "Essential only" opt-out and clears stored habits immediately.
 *  - Capped under ~2KB so HTTP headers stay lightweight.
 */

const CONSENT_COOKIE = 'verndly_cookie_consent';
const HABITS_COOKIE = 'verndly_shopping_habits';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 180; // 180 days
export const HABITS_UPDATED_EVENT = 'verndly:habits-updated';
export const CONSENT_UPDATED_EVENT = 'verndly:cookie-consent-updated';

export type CookieConsentChoice = 'accepted' | 'essential' | null;

export interface ShoppingHabitsProfile {
  v: 1;
  /** Weighted category affinities, e.g. { "Electronics": 18 } */
  c: Record<string, number>;
  /** Weighted subcategory affinities, e.g. { "Laptops": 22, "Phones": 12 } */
  s: Record<string, number>;
  /** Weighted brand affinities */
  b: Record<string, number>;
  /** Weighted tags / search keywords */
  t: Record<string, number>;
  /** Rolling recent product IDs (max 12) */
  r: string[];
  /** Rolling price samples (max 10) to infer price comfort band */
  p: number[];
  /** Last updated epoch ms */
  u: number;
}

const EMPTY_HABITS = (): ShoppingHabitsProfile => ({
  v: 1,
  c: {},
  s: {},
  b: {},
  t: {},
  r: [],
  p: [],
  u: Date.now(),
});

function readRawCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const raw of parts) {
    const trimmed = raw.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function writeRawCookie(name: string, value: string, maxAgeSec = COOKIE_MAX_AGE_SEC) {
  if (typeof document === 'undefined') return;
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getCookieConsent(): CookieConsentChoice {
  const val = readRawCookie(CONSENT_COOKIE);
  if (val === 'accepted' || val === 'essential') return val;
  return null;
}

export function setCookieConsent(choice: 'accepted' | 'essential') {
  writeRawCookie(CONSENT_COOKIE, choice);
  if (choice === 'essential') {
    deleteCookie(HABITS_COOKIE);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT, { detail: choice }));
    window.dispatchEvent(new CustomEvent(HABITS_UPDATED_EVENT));
  }
}

export function isPersonalizationAllowed(): boolean {
  // Allow learning unless the shopper explicitly opted out to "essential" only.
  return getCookieConsent() !== 'essential';
}

function trimWeightedMap(map: Record<string, number>, maxEntries: number): Record<string, number> {
  return Object.fromEntries(
    Object.entries(map)
      .filter(([k, v]) => k.trim().length > 0 && Number.isFinite(v) && v > 0.25)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxEntries)
      .map(([k, v]) => [k, Math.round(v * 10) / 10]),
  );
}

function applyTimeDecay(profile: ShoppingHabitsProfile): ShoppingHabitsProfile {
  const daysElapsed = Math.max(0, (Date.now() - (profile.u || Date.now())) / (1000 * 60 * 60 * 24));
  if (daysElapsed < 1) return profile;
  // Gentle 3% decay per day so newer shopping intent naturally rises to the top
  const factor = Math.pow(0.97, Math.min(daysElapsed, 60));
  const decay = (m: Record<string, number>) =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v * factor]));
  return {
    ...profile,
    c: decay(profile.c),
    s: decay(profile.s),
    b: decay(profile.b),
    t: decay(profile.t),
    u: Date.now(),
  };
}

export function getShoppingHabits(): ShoppingHabitsProfile {
  if (!isPersonalizationAllowed()) return EMPTY_HABITS();
  const raw = readRawCookie(HABITS_COOKIE);
  if (!raw) return EMPTY_HABITS();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY_HABITS();
    return {
      v: 1,
      c: parsed.c && typeof parsed.c === 'object' ? parsed.c : {},
      s: parsed.s && typeof parsed.s === 'object' ? parsed.s : {},
      b: parsed.b && typeof parsed.b === 'object' ? parsed.b : {},
      t: parsed.t && typeof parsed.t === 'object' ? parsed.t : {},
      r: Array.isArray(parsed.r) ? parsed.r.slice(0, 12) : [],
      p: Array.isArray(parsed.p) ? parsed.p.slice(0, 10) : [],
      u: typeof parsed.u === 'number' ? parsed.u : Date.now(),
    };
  } catch {
    return EMPTY_HABITS();
  }
}

export function clearShoppingHabits() {
  deleteCookie(HABITS_COOKIE);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HABITS_UPDATED_EVENT));
  }
}

function saveShoppingHabits(profile: ShoppingHabitsProfile) {
  if (!isPersonalizationAllowed()) return;
  const compact: ShoppingHabitsProfile = {
    v: 1,
    c: trimWeightedMap(profile.c, 8),
    s: trimWeightedMap(profile.s, 8),
    b: trimWeightedMap(profile.b, 6),
    t: trimWeightedMap(profile.t, 12),
    r: profile.r.slice(0, 12),
    p: profile.p.slice(0, 10),
    u: Date.now(),
  };
  try {
    const serialized = JSON.stringify(compact);
    // Keep safely under standard 4KB browser cookie limit
    if (serialized.length < 3200) {
      writeRawCookie(HABITS_COOKIE, serialized);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(HABITS_UPDATED_EVENT, { detail: compact }));
      }
    }
  } catch {
    // ignore serialization errors
  }
}

export type HabitEventType =
  | 'view_product'
  | 'browse_category'
  | 'search'
  | 'favorite'
  | 'add_to_cart';

const EVENT_WEIGHTS: Record<
  HabitEventType,
  { category: number; subcategory: number; brand: number; tag: number }
> = {
  browse_category: { category: 2.5, subcategory: 3.5, brand: 2, tag: 1.5 },
  search: { category: 2.5, subcategory: 4, brand: 2.5, tag: 3 },
  view_product: { category: 3, subcategory: 4.5, brand: 2.5, tag: 1.5 },
  favorite: { category: 5, subcategory: 6.5, brand: 4, tag: 2.5 },
  add_to_cart: { category: 8, subcategory: 10, brand: 5.5, tag: 3 },
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'new',
  'ghana',
  'accra',
  'best',
  'cheap',
  'buy',
  'shop',
  'store',
]);

function addWeight(map: Record<string, number>, key: string | null | undefined, weight: number) {
  const clean = (key || '').trim().slice(0, 40);
  if (!clean || weight <= 0) return;
  map[clean] = (map[clean] || 0) + weight;
}

export function recordShoppingHabit(
  event: HabitEventType,
  signal: {
    productId?: string | null;
    category?: string | null;
    subcategory?: string | null;
    brand?: string | null;
    tags?: string[] | null;
    query?: string | null;
    price?: number | string | null;
  },
) {
  if (typeof window === 'undefined' || !isPersonalizationAllowed()) return;

  const profile = applyTimeDecay(getShoppingHabits());
  const w = EVENT_WEIGHTS[event];

  addWeight(profile.c, signal.category, w.category);
  addWeight(profile.s, signal.subcategory, w.subcategory);
  addWeight(profile.b, signal.brand, w.brand);

  if (Array.isArray(signal.tags)) {
    for (const tag of signal.tags.slice(0, 5)) {
      addWeight(profile.t, tag, w.tag);
    }
  }

  if (signal.query && signal.query.trim().length >= 2) {
    const words = signal.query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
      .slice(0, 4);
    for (const word of words) {
      addWeight(profile.t, word, w.tag);
    }
  }

  if (signal.productId) {
    profile.r = [signal.productId, ...profile.r.filter((id) => id !== signal.productId)].slice(
      0,
      12,
    );
  }

  if (signal.price !== undefined && signal.price !== null) {
    const numPrice = Number(signal.price);
    if (Number.isFinite(numPrice) && numPrice > 0) {
      profile.p = [Math.round(numPrice), ...profile.p].slice(0, 10);
    }
  }

  saveShoppingHabits(profile);
}

export function extractHabitQuerySignals(profile: ShoppingHabitsProfile) {
  const sortedKeys = (map: Record<string, number>) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

  const categories = sortedKeys(profile.c);
  const subcategories = sortedKeys(profile.s);
  const brands = sortedKeys(profile.b);
  const tags = sortedKeys(profile.t);

  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (profile.p.length >= 2) {
    minPrice = Math.min(...profile.p);
    maxPrice = Math.max(...profile.p);
  }

  const hasHabits =
    categories.length > 0 || subcategories.length > 0 || brands.length > 0 || tags.length > 0;

  return {
    hasHabits,
    categories,
    subcategories,
    brands,
    tags,
    recentIds: profile.r,
    minPrice,
    maxPrice,
  };
}
