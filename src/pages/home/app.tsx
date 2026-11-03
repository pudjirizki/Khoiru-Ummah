import React from 'react';
import { Helmet } from 'react-helmet-async';
// sections
import { HomeView } from '/src/sections/home/view';

const HomePage: React.FC = () => (
  <>
    <Helmet>
      <title>Khoiru Ummah - Platform Penilaian Sikap Siswa</title>
      <meta name="description" content="Platform untuk mencatat dan memantau perkembangan sikap siswa." />
    </Helmet>
    <HomeView />
  </>
);

export default HomePage;
