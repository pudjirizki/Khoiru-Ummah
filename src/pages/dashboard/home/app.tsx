import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { HomeView } from '/src/sections/dashboard/home/view';

// ----------------------------------------------------------------------

const DashboardHomePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,home" />
      </Helmet>

      <HomeView />
    </>
  );
};

export default DashboardHomePage;
