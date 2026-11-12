import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useDatabaseUser } from '/src/hooks/use-database-user';
// sections
import { AdminAttendanceView, AttendanceView } from '/src/sections/dashboard/attendance/view';

const DashboardAttendancePage: React.FC = () => {
  const { currentUser } = useDatabaseUser();

  return (
    <>
      <Helmet>
        <title>Absensi Guru - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Catat dan verifikasi kehadiran guru." />
      </Helmet>
      {currentUser?.databaseUsers?.role === 'admin' ? <AdminAttendanceView /> : <AttendanceView />}
    </>
  );
};

export default DashboardAttendancePage;
