import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { UserCreateView } from '/src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const DashboardCreateUserPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Tambah Pengguna - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Tambah Pengguna - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,student" />
      </Helmet>

      <UserCreateView />
    </>
  );
};

export default DashboardCreateUserPage;
