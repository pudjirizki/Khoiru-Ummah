import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { UserView } from '/src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const DashboardUserPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Pengguna - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Pengguna - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,student" />
      </Helmet>

      <UserView />
    </>
  );
};

export default DashboardUserPage;
