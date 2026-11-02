import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
// layouts
import { MainLayout } from '/src/layouts/main';
// components
import { LoadingScreen } from '/src/components/loading-screen';
// pages
export const HomePage = lazy(() => import('/src/pages/home/app'));

// ----------------------------------------------------------------------

export const mainRoutes = [
  {
    path: '/',
    element: (
      <MainLayout>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </MainLayout>
    ),
    children: [{ element: <HomePage />, index: true }],
  },
];
