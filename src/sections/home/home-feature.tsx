import React from 'react';
// components
import { Image } from '/src/components/image';
//
import { FeatureHomeInterface } from './view/home-view';

// ----------------------------------------------------------------------

interface HomeFeatureProps {
  features: FeatureHomeInterface[];
}

// ----------------------------------------------------------------------

const HomeFeature: React.FC<HomeFeatureProps> = ({ features }) => {
  return (
    <div className="pt-15 flex flex-col items-center justify-center gap-16">
      <div className="flex max-w-[808px] flex-col gap-3">
        <p className="text-center text-4xl font-semibold md:text-[42px] md:leading-normal">Coba Fitur Kami</p>
        <p className="text-center font-opensans">Fitur lengkap untuk penilaian dan pemantauan sikap siswa secara objektif dan berkelanjutan.</p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-20">{features?.map((feature, i) => <RenderCard key={i} feature={feature} />)}</div>
    </div>
  );
};

function RenderCard({ feature }: { feature: FeatureHomeInterface }) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
      <Image src={feature.image} alt={feature.title} className="h-[220px] w-full object-cover transition-transform duration-500 group-hover:scale-105" />

      <div className="flex flex-col gap-2 p-5">
        <p className="font-poppins text-2xl font-semibold">{feature?.title}</p>
        <p className="font-opensans leading-7 text-neutral-600">{feature.desc}</p>
      </div>
    </div>
  );
}

export default HomeFeature;
