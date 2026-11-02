import React from 'react';
// routes
import { paths } from '/src/routes/paths';
// components
import { Image } from '/src/components/image';
import { Button } from '/src/components/button';
//
import HomeChart from '../home-chart';
import HomeFeature from '../home-feature';
import HomeStatistics from '../home-statistics';

// ----------------------------------------------------------------------

export interface FeatureHomeInterface {
  title: string;
  desc: string;
  image: string;
}

// ----------------------------------------------------------------------

const features: FeatureHomeInterface[] = [
  {
    title: 'Membuat Formulir',
    desc: 'Guru dapat membuat formulir penilaian sikap siswa berdasarkan kriteria yang telah ditentukan, sehingga proses penilaian menjadi lebih terstruktur dan mudah digunakan.',
    image: '/assets/images/image-2.png',
  },
  {
    title: 'Mengisi Formulir',
    desc: 'Guru dan wali murid dapat mengisi formulir penilaian secara online sesuai dengan kondisi dan perkembangan sikap siswa yang diamati.',
    image: '/assets/images/image-3.png',
  },
  {
    title: 'Visualisasi Hasil',
    desc: 'Hasil penilaian ditampilkan dalam bentuk grafik dan ringkasan nilai untuk memudahkan pemantauan perkembangan sikap siswa dari waktu ke waktu.',
    image: '/assets/images/image-4.png',
  },
];
// ----------------------------------------------------------------------

const HomeView: React.FC = () => {
  return (
    <section>
      <div className="flex flex-col-reverse items-center gap-12 lg:flex-row lg:justify-between">
        <div className="max-w-[650px]">
          <div className="mb-4 inline-flex items-center rounded-full bg-primary-2/10 px-4 py-2 text-sm font-medium text-primary-1">✨ Platform Penilaian Sikap Siswa Modern</div>

          <h1 className="text-center font-poppins text-4xl font-bold leading-tight md:text-5xl lg:text-left lg:text-6xl">
            Pantau Perkembangan
            <span className="text-primary-1"> Sikap Siswa </span>
            Secara Objektif
          </h1>

          <p className="mt-6 text-center font-opensans text-lg text-neutral-600 lg:text-left">
            Membantu guru dan wali siswa mencatat, menilai, dan memantau perkembangan sikap siswa melalui sistem digital yang mudah digunakan dan transparan.
          </p>

          <div className="mt-10">
            <Button component="RouterLink" href={paths.dashboard.root} className="rounded-2xl bg-primary-1 px-10 py-6 text-lg font-semibold hover:bg-primary-3">
              Mulai Sekarang
            </Button>
          </div>
        </div>

        <div>
          <Image src="/assets/images/image-9.png" alt="teaching" className="h-[300px] w-[400px] md:h-[500px] md:w-[600px]" />
        </div>
      </div>

      <HomeStatistics />

      <HomeFeature features={features} />

      <HomeChart />

      <div className="mt-12 rounded-[40px] bg-primary-1 p-12 text-center text-white">
        <p className="">Siap Memantau Perkembangan Siswa Dengan Lebih Baik?</p>
        <p className="">Mulai gunakan platform penilaian sikap siswa untuk mendukung kolaborasi antara sekolah dan wali siswa.</p>

        <Button component="RouterLink" href={paths.dashboard.root} className="mt-8 rounded-2xl bg-white px-10 py-6 text-primary-1 hover:bg-neutral-100">
          Mulai Sekarang
        </Button>
      </div>
    </section>
  );
};

export default HomeView;
