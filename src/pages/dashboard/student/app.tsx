import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { StudentView } from '/src/sections/dashboard/student/view';

// ----------------------------------------------------------------------

const DashboardStudentPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Siswa - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Siswa - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,student" />
      </Helmet>

      <StudentView />
    </>
  );
};

export default DashboardStudentPage;
