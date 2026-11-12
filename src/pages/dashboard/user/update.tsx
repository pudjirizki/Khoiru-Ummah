import React from 'react';
import { Helmet } from 'react-helmet-async';
// hooks
import { useParams } from '/src/routes/hooks';
// sections
import { UserUpdateView } from '/src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const DashboardUpdateUserPage: React.FC = () => {
  const params = useParams();

  const { slug } = params;

  return (
    <>
      <Helmet>
        <title> Update Pengguna - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Update Pengguna - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,student" />
      </Helmet>

      <UserUpdateView slug={`${slug}`} />
    </>
  );
};

export default DashboardUpdateUserPage;
