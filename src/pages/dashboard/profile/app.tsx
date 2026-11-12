import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { ProfileView } from '/src/sections/dashboard/profile/view';

// ----------------------------------------------------------------------

const DashboardProfilePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Profile - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Profile - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,profile" />
      </Helmet>

      <ProfileView />
    </>
  );
};

export default DashboardProfilePage;
