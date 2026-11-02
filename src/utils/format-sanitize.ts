import DOMPurify from 'dompurify';

// ----------------------------------------------------------------------

export function sanitizeToNumber(value: string | undefined | null): number {
  const sanitized = (value || '').replace(/[^\d.-]/g, '');
  return isNaN(Number(sanitized)) ? 0 : Number(sanitized);
}

export function sanitizeToString(value: string | undefined | null): string {
  return DOMPurify.sanitize(value || '');
}
