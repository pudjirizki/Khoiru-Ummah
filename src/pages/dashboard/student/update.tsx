import React from 'react';
import { Helmet } from 'react-helmet-async';
// hooks
import { useParams } from '/src/routes/hooks';
// sections
import { StudentUpdateView } from '/src/sections/dashboard/student/view';

// ----------------------------------------------------------------------

const DashboardUpdateStudentPage: React.FC = () => {
  const params = useParams();

  const { slug } = params;

  return (
    <>
      <Helmet>
        <title> Update Siswa - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Tambah Siswa - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,student" />
      </Helmet>

      <StudentUpdateView slug={`${slug}`} />
    </>
  );
};

export default DashboardUpdateStudentPage;
