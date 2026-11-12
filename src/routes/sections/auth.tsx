import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
// layouts
import { AuthLayout } from '/src/layouts/auth';
import { GuestGuard } from '/src/layouts/guard';
// components
import { LoadingScreen } from '/src/components/loading-screen';
// pages
const LoginPage = lazy(() => import('/src/pages/auth/login/app'));

// ----------------------------------------------------------------------

export const authRoutes = [
  {
    path: 'auth',
    element: (
      <GuestGuard>
        <AuthLayout>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </AuthLayout>
      </GuestGuard>
    ),
    children: [
      {
        path: 'login',
        children: [{ element: <LoginPage />, index: true }],
      },
    ],
  },
];
