import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { AttendanceView } from '/src/sections/dashboard/attendance/view';

const DashboardAttendancePage: React.FC = () => (
  <>
    <Helmet>
      <title>Absensi Guru - Dashboard - Khoiru Ummah</title>
      <meta name="description" content="Pencatatan dan pengelolaan absensi guru." />
    </Helmet>
    <AttendanceView />
  </>
);

export default DashboardAttendancePage;
