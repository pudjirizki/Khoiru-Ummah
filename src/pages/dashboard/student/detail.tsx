import React from 'react';
import { Helmet } from 'react-helmet-async';
// hooks
import { useParams } from '/src/routes/hooks';
// sections
import { StudentDetailView } from '/src/sections/dashboard/student/view';

// ----------------------------------------------------------------------

const DashboardDetailStudentPage: React.FC = () => {
  const params = useParams();

  const { slug } = params;

  return (
    <>
      <Helmet>
        <title> Detail Siswa - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Tambah Siswa - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,student" />
      </Helmet>

      <StudentDetailView slug={`${slug}`} />
    </>
  );
};

export default DashboardDetailStudentPage;
