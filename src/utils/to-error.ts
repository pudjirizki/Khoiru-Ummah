export const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;

  if (typeof error === 'object' && error !== null) {
    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    const details = 'details' in error && typeof error.details === 'string' ? error.details : '';
    const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint : '';
    const description = [message, details, hint].filter(Boolean).join(' — ');

    if (description) return new Error(description);
  }

  return new Error(String(error));
};
