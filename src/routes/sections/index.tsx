import React from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
//
import { authRoutes } from './auth';
import { dashboardRoutes } from './dashboard';
import { mainRoutes, HomePage } from './main';

// ----------------------------------------------------------------------

const Router: React.FC = () => {
  return useRoutes([
    {
      path: '/',
      element: <HomePage />,
    },

    ...authRoutes,

    ...mainRoutes,

    ...dashboardRoutes,

    // No match 404
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
};

export default Router;
