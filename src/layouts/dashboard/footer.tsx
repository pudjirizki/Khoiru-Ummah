import React from 'react';
// components
import { Image } from '/src/components/image';

// ----------------------------------------------------------------------

const currentDate = new Date();

// ----------------------------------------------------------------------

const Footer: React.FC = () => {
  return (
    <footer className="flex flex-col items-center justify-center gap-5 bg-[#14532D] px-7 py-5 md:px-10 lg:ml-[284px]">
      <div className="h-[50px] w-[200px]">
        <Image src="/favicon/logo_full.png" alt="khoiru-ummah" className="h-full w-full" />
      </div>

      <div className="">
        <p className="font-inter text-sm text-primary-2">Copyright © {currentDate.getFullYear()} Khoiru Ummah</p>
      </div>
    </footer>
  );
};

export default Footer;
