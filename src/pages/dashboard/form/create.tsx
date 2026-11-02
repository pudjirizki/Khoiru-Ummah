import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { FormCreateView } from '/src/sections/dashboard/form/view';

// ----------------------------------------------------------------------

const DashboardCreateFormPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Buat Formulir - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Buat Formulir - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,form" />
      </Helmet>

      <FormCreateView />
    </>
  );
};

export default DashboardCreateFormPage;
