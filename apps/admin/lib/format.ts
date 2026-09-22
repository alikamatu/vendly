import { formatDistanceToNow, format, isValid } from 'date-fns';

const cediFormatter = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(
  value: number | string | null | undefined,
  currency = 'GHS',
): string {
  const n = Number(value ?? 0);
  const valid = Number.isFinite(n) ? n : 0;

  if (currency === 'NGN') {
    return `₦${nairaFormatter.format(valid)}`;
  }
  return `₵${cediFormatter.format(valid)}`;
}

export function cedi(value: number | string | null | undefined): string {
  return formatCurrency(value, 'GHS');
}

export function compact(n: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

export function dateShort(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(d)) return '—';
  return format(d, 'd MMM yyyy');
}

export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(d)) return '—';
  return format(d, 'd MMM yyyy, HH:mm');
}

export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(d)) return '—';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function maskPhone(p?: string | null): string {
  if (!p) return '—';
  const trimmed = p.replace(/\s+/g, '');
  if (trimmed.length < 6) return trimmed;
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-3)}`;
}

export function shortId(id?: string | null, len = 8): string {
  if (!id) return '—';
  return id.slice(0, len);
}
