import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { HomeView } from '/src/sections/home/view';

// ----------------------------------------------------------------------

const HomePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title> Khoiru Ummah</title>
        <meta name="description" content="Khoiru Ummah" />
        <meta name="keywords" content="web,application,landingpage,khoiruummah,home" />
      </Helmet>

      <HomeView />
    </>
  );
};

export default HomePage;
