import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { LoginView } from '/src/sections/auth/login/view';

// ----------------------------------------------------------------------

const LoginPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Masuk - Khoiru Ummah</title>
        <meta name="description" content="Masuk - Khoiru Ummah" />
        <meta name="keywords" content="web,application,auth,khoiruummah,login" />
      </Helmet>

      <LoginView />
    </>
  );
};

export default LoginPage;
