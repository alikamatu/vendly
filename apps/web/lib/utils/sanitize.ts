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
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

export function sanitizeText(value: string, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return escapeHtml(
    stripTags(
      normalizeWhitespace(
        removeControlChars(value)
      )
    )
  ).slice(0, maxLength);
}

export function sanitizeTag(value: string): string {
  return sanitizeText(value, 50)
    .replace(/[^a-zA-Z0-9\s\-_&]/g, '') // Only allow safe chars in tags
    .trim();
}

export interface RawProductInputs {
  title: string;
  description: string;
  tags: string[];
  attributes: Record<string, string>;
}

export function sanitizeProductInputs(data: RawProductInputs): RawProductInputs {
  return {
    title: sanitizeText(data.title, 200),
    description: sanitizeText(data.description, 2000),
    tags: data.tags
      .map(sanitizeTag)
      .filter(Boolean)
      .slice(0, 20),
    attributes: Object.fromEntries(
      Object.entries(data.attributes).map(([k, v]) => [
        sanitizeText(k, 50),
        sanitizeText(String(v ?? ''), 200),
      ])
    ),
  };
}
