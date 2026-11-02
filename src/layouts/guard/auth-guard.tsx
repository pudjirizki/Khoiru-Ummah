import { useEffect, useCallback, useState, ReactNode } from 'react';
// routes
import { paths } from '/src/routes/paths';
import { useRouter } from '/src/routes/hooks';
// context
import { useUserContext } from '/src/context/user';

// ----------------------------------------------------------------------

interface AuthGuardProps {
  children: ReactNode;
}

// ----------------------------------------------------------------------

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [checked, setChecked] = useState(false);

  const { status, isLoading } = useUserContext();

  const router = useRouter();

  const check = useCallback(() => {
    if (isLoading) return;

    if (status === 'unauthenticated') {
      const searchParams = new URLSearchParams({
        returnTo: window.location.pathname,
      }).toString();

      const loginPath = paths.auth.login;
      const href = `${loginPath}?${searchParams}`;

      router.replace(href);
    } else {
      setChecked(true);
    }
  }, [status, router, isLoading]);

  useEffect(() => {
    check();
  }, [check]);

  if (!checked) {
    return <div />;
  }

  return <>{children}</>;
};

export default AuthGuard;
