import React from 'react';
import { Helmet } from 'react-helmet-async';
// routes
import { useParams } from '/src/routes/hooks';
// sections
import { FormInputView } from '/src/sections/dashboard/form/view';

// ----------------------------------------------------------------------

const DashboardInputFormPage: React.FC = () => {
  const params = useParams();

  const { slug } = params;

  return (
    <>
      <Helmet>
        <title> Isi Formulir - Dashboard - Khoiru Ummah</title>
        <meta name="description" content="Isi Formulir - Dashboard - Khoiru Ummah" />
        <meta name="keywords" content="web,application,dashboard,khoiruummah,form" />
      </Helmet>

      <FormInputView slug={`${slug}`} />
    </>
  );
};

export default DashboardInputFormPage;
