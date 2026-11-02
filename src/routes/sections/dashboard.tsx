import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
// layouts
import { AuthGuard } from '/src/layouts/guard';
import { DashboardLayout } from '/src/layouts/dashboard';
// components
import { LoadingScreen } from '/src/components/loading-screen';
// pages
const DashboardHomePage = lazy(() => import('/src/pages/dashboard/home/app'));
const DashboardProfilePage = lazy(() => import('/src/pages/dashboard/profile/app'));
const DashboardUserPage = lazy(() => import('/src/pages/dashboard/user/app'));
const DashboardCreateUserPage = lazy(() => import('/src/pages/dashboard/user/create'));
const DashboardUpdateUserPage = lazy(() => import('/src/pages/dashboard/user/update'));
const DashboardDetailUserPage = lazy(() => import('/src/pages/dashboard/user/detail'));
const DashboardStudentPage = lazy(() => import('/src/pages/dashboard/student/app'));
const DashboardCreateStudentPage = lazy(() => import('/src/pages/dashboard/student/create'));
const DashboardUpdateStudentPage = lazy(() => import('/src/pages/dashboard/student/update'));
const DashboardDetailStudentPage = lazy(() => import('/src/pages/dashboard/student/detail'));
const DashboardFormPage = lazy(() => import('/src/pages/dashboard/form/app'));
const DashboardInputFormPage = lazy(() => import('/src/pages/dashboard/form/input'));
const DashboardCreateFormPage = lazy(() => import('/src/pages/dashboard/form/create'));
const DashboardUpdateFormPage = lazy(() => import('/src/pages/dashboard/form/update'));
const DashboardDetailFormPage = lazy(() => import('/src/pages/dashboard/form/detail'));

// ----------------------------------------------------------------------

export const dashboardRoutes = [
  {
    path: 'dashboard',
    element: (
      <AuthGuard>
        <DashboardLayout>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </AuthGuard>
    ),
    children: [
      { element: <DashboardHomePage />, index: true },
      {
        path: 'form',
        children: [
          { element: <DashboardFormPage />, index: true },
          { path: 'create', element: <DashboardCreateFormPage /> },
          { path: ':slug/input', element: <DashboardInputFormPage /> },
          { path: ':slug/update', element: <DashboardUpdateFormPage /> },
          { path: ':slug/detail', element: <DashboardDetailFormPage /> },
        ],
      },
      {
        path: 'user',
        children: [
          { element: <DashboardUserPage />, index: true },
          { path: 'create', element: <DashboardCreateUserPage /> },
          { path: ':slug/update', element: <DashboardUpdateUserPage /> },
          { path: ':slug/detail', element: <DashboardDetailUserPage /> },
        ],
      },
      {
        path: 'student',
        children: [
          { element: <DashboardStudentPage />, index: true },
          { path: 'create', element: <DashboardCreateStudentPage /> },
          { path: ':slug/update', element: <DashboardUpdateStudentPage /> },
          { path: ':slug/detail', element: <DashboardDetailStudentPage /> },
        ],
      },
      {
        path: 'profile',
        children: [{ element: <DashboardProfilePage />, index: true }],
      },
    ],
  },
];
