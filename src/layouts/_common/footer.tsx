import React from 'react';
// routes
import { paths } from '/src/routes/paths';
// components
import { Image } from '/src/components/image';

// ----------------------------------------------------------------------

const currentDate = new Date();

// ----------------------------------------------------------------------

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary-1">
      <div className="container mx-auto px-6 py-12 md:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-md">
            <Image src="/favicon/logo_full.png" alt="Khoiru Ummah" className="h-auto w-[180px] object-contain" />

            <p className="mt-4 font-opensans leading-7 text-green-100">
              Platform penilaian dan pemantauan sikap siswa yang membantu guru dan wali siswa berkolaborasi dalam mendukung perkembangan karakter anak secara berkelanjutan.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-poppins text-lg font-semibold text-white">Navigasi</h4>

            <div className="flex flex-col gap-3">
              <a href="/" className="font-opensans text-green-100 transition hover:text-white">
                Beranda
              </a>

              <a href={paths.dashboard.root} className="font-opensans text-green-100 transition hover:text-white">
                Dashboard
              </a>

              <a href={paths.dashboard.root} className="font-opensans text-green-100 transition hover:text-white">
                Masuk
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-poppins text-lg font-semibold text-white">Informasi</h4>

            <div className="flex flex-col gap-3 font-opensans text-green-100">
              <p>Sistem Penilaian Sikap Siswa</p>
              <p>Berbasis Web</p>
              <p>Kolaborasi Guru & Wali Siswa</p>
            </div>
          </div>
        </div>

        <div className="my-8 h-px w-full bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
          <p className="font-inter text-sm text-green-100">© {currentDate.getFullYear()} Khoiru Ummah. All rights reserved.</p>

          <p className="font-inter text-sm text-green-100">Dibangun untuk mendukung pendidikan karakter siswa.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
