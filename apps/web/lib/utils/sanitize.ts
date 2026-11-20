/**
 * Pure-JS sanitization — no DOM required (works in SSR and client).
 * Guards against XSS, null-byte injection, and control-character smuggling
 * before values reach the Zod schema or the API.
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (c) => HTML_ENTITIES[c] ?? c);
}

function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

function removeControlChars(str: string): string {
  // Remove null bytes and non-printable ASCII control characters
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

export function sanitizeText(value: string, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return escapeHtml(stripTags(normalizeWhitespace(removeControlChars(value)))).slice(0, maxLength);
}
