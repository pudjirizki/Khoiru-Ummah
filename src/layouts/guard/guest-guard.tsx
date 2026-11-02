import React, { ReactNode, useCallback, useEffect } from 'react';
// routes
import { paths } from '/src/routes/paths';
import { useRouter, useSearchParams } from '/src/routes/hooks';
// context
import { useUserContext } from '/src/context/user';

// ----------------------------------------------------------------------

interface GuestGuardProps {
  children: ReactNode;
}

// ----------------------------------------------------------------------

const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { status, isLoading } = useUserContext();

  const router = useRouter();

  const searchParams = useSearchParams();

  const returnTo = searchParams?.get('returnTo') || paths.dashboard.root;

  const check = useCallback(() => {
    if (isLoading) return;

    if (status === 'authenticated') {
      router.replace(returnTo);
    }
  }, [status, returnTo, router, isLoading]);

  useEffect(() => {
    check();
  }, [check]);

  if (isLoading) return null;

  return <>{children}</>;
};

export default GuestGuard;
