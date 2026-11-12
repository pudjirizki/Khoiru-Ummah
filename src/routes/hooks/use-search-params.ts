import { useMemo } from 'react';
import { useSearchParams as _useSearchParams } from 'react-router-dom';

// ----------------------------------------------------------------------

export function useSearchParams(): URLSearchParams {
  const [searchParams] = _useSearchParams();

  return useMemo(() => searchParams, [searchParams]);
}
