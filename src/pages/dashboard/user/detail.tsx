import React from 'react';
import { Helmet } from 'react-helmet-async';
// hooks
import { useParams } from '/src/routes/hooks';
// sections
import { UserDetailView } from '/src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const DashboardDetailUserPage: React.FC = () => {
  const params = useParams();

  const { slug } = params;

  return (
    <>
      <Helmet>
        <title> Detail Pengguna - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Detail Pengguna - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,student" />
      </Helmet>

      <UserDetailView slug={`${slug}`} />
    </>
  );
};

export default DashboardDetailUserPage;
