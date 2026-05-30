#!/usr/bin/env node
/**
 * Notify search engines that the sitemap has changed.
 *
 *   • Google + Bing **deprecated** the `?sitemap=` ping endpoints in 2023.
 *     Search Console / Webmaster Tools is now the only supported path for
 *     those — submit the sitemap there once per property. We don't ping
 *     them from here.
 *   • IndexNow (https://www.indexnow.org/) is the modern replacement.
 *     Bing, Yandex, Naver, Seznam, and Yep support it; Google does not.
 *
 * Required env:
 *   NEXT_PUBLIC_SITE_URL  (defaults to https://verndly.com)
 *   INDEXNOW_KEY          your key (must also be served at
 *                         /<INDEXNOW_KEY>.txt from the public folder).
 *
 * The script no-ops with a friendly log if INDEXNOW_KEY isn't set, so it
 * never fails CI. Run it from `npm run postbuild`.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://verndly.com").replace(/\/$/, "");
const KEY = process.env.INDEXNOW_KEY;

async function main() {
  if (!KEY) {
    console.log("[indexnow] INDEXNOW_KEY not set — skipping ping.");
    console.log("[indexnow]   Generate a key at https://www.indexnow.org/");
    console.log("[indexnow]   Save it as public/<KEY>.txt (contents = the key)");
    console.log("[indexnow]   Then set INDEXNOW_KEY in your build env.");
    return;
  }

  const sitemap = `${SITE}/sitemap.xml`;
  const url = `https://api.indexnow.org/IndexNow?url=${encodeURIComponent(
    sitemap,
  )}&key=${encodeURIComponent(KEY)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (res.ok || res.status === 202) {
      console.log(`[indexnow] Submitted ${sitemap} (status ${res.status}).`);
    } else {
      const text = await res.text().catch(() => "");
      console.warn(
        `[indexnow] Non-OK response (${res.status}). ${text.slice(0, 200)}`,
      );
    }
  } catch (err) {
    console.warn(`[indexnow] Submit failed: ${err?.message || err}`);
  }
}

main();
