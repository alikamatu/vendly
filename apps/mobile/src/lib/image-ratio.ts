/**
 * Pinterest-style layouts need each image's real shape. We learn it when the
 * image loads (height / width) and cache it per URL so later renders and
 * column balancing use the true size instead of a guess.
 */
const cache = new Map<string, number>();

const MIN = 0.75; // wide-ish
const MAX = 1.6; // tall

export function clampRatio(r: number) {
  if (!Number.isFinite(r) || r <= 0) return 1;
  return Math.min(MAX, Math.max(MIN, r));
}

export function rememberRatio(url: string, width: number, height: number) {
  if (!url || !width || !height) return;
  cache.set(url, clampRatio(height / width));
}

export function getCachedRatio(url?: string | null) {
  return url ? cache.get(url) : undefined;
}

/** Stable pseudo-random ratio from a key, so placeholders vary but don't jump. */
export function estimateHeightRatio(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const options = [1, 1.25, 1.33, 0.85, 1.15, 1.4];
  return options[Math.abs(h) % options.length]!;
}

export function ratioFor(url: string | null | undefined, fallbackKey: string) {
  return getCachedRatio(url) ?? estimateHeightRatio(fallbackKey);
}
