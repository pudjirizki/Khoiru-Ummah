import React from 'react';
import { Helmet } from 'react-helmet-async';
// routes
import { useParams } from '/src/routes/hooks';
// sections
import { FormUpdateView } from '/src/sections/dashboard/form/view';

// ----------------------------------------------------------------------

const DashboardUpdateFormPage: React.FC = () => {
  const params = useParams();

  const { slug } = params;

  return (
    <>
      <Helmet>
        <title> Edit Formulir - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Edit Formulir - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,form" />
      </Helmet>

      <FormUpdateView slug={`${slug}`} />
    </>
  );
};

export default DashboardUpdateFormPage;
