import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { FormView } from '/src/sections/dashboard/form/view';

// ----------------------------------------------------------------------

const DashboardFormPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Formulir - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Formulir - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,form" />
      </Helmet>

      <FormView />
    </>
  );
};

export default DashboardFormPage;
