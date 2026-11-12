import { useMemo } from 'react';
import { useParams as _useParams, Params } from 'react-router-dom';

// ----------------------------------------------------------------------

export function useParams(): Params {
  const params = _useParams();

  return useMemo(() => params, [params]);
}
