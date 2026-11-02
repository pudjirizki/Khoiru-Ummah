import React from 'react';
import { Helmet } from 'react-helmet-async';
// routes
import { useParams } from '/src/routes/hooks';
// sections
import { FormDetailView } from '/src/sections/dashboard/form/view';

// ----------------------------------------------------------------------

const DashboardDetailFormPage: React.FC = () => {
  const params = useParams();

  const { slug } = params;

  return (
    <>
      <Helmet>
        <title> Detail Formulir - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Isi Formulir - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,form" />
      </Helmet>

      <FormDetailView slug={`${slug}`} />
    </>
  );
};

export default DashboardDetailFormPage;
