/**
 * Single source of truth for Verndly's public support / contact details.
 *
 * Override per-environment via `NEXT_PUBLIC_SUPPORT_EMAIL` and
 * `NEXT_PUBLIC_SUPPORT_PHONE` (the human-readable phone, e.g. "+233 53 406
 * 5652"). Everything else — the tel:, mailto:, and wa.me links — is derived
 * here so the rest of the app never hand-builds a contact link.
 */

/** Public support inbox shown across the site. */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@verndly.com";

/** Human-readable phone, exactly as it should render in the UI. */
export const SUPPORT_PHONE_DISPLAY =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+233 53 406 5652";

/** Digits only (no spaces / no +), used for wa.me links. */
export const SUPPORT_PHONE_DIGITS = SUPPORT_PHONE_DISPLAY.replace(/[^\d]/g, "");

/** E.164 form (leading +), used for tel: links. */
export const SUPPORT_PHONE_E164 = `+${SUPPORT_PHONE_DIGITS}`;

/** Ready-to-use link helpers. */
export const SUPPORT_TEL_HREF = `tel:${SUPPORT_PHONE_E164}`;
export const SUPPORT_WHATSAPP_HREF = `https://wa.me/${SUPPORT_PHONE_DIGITS}`;

/** Build a mailto: link to support with an optional subject. */
export function supportMailto(subject?: string): string {
  return subject
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${SUPPORT_EMAIL}`;
}

/** WhatsApp deep link with an optional prefilled message. */
export function supportWhatsApp(message?: string): string {
  return message
    ? `${SUPPORT_WHATSAPP_HREF}?text=${encodeURIComponent(message)}`
    : SUPPORT_WHATSAPP_HREF;
}
