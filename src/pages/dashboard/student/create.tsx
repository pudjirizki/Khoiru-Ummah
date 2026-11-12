import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { StudentCreateView } from '/src/sections/dashboard/student/view';

// ----------------------------------------------------------------------

const DashboardCreateStudentPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Tambah Siswa - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Tambah Siswa - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,student" />
      </Helmet>

      <StudentCreateView />
    </>
  );
};

export default DashboardCreateStudentPage;
