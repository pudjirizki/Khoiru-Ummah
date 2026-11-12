import React from 'react';
import { Icon } from '@iconify/react';

// ----------------------------------------------------------------------

interface SummaryProps {
  total: number;
  title: string;
  icon: string;
}

// ----------------------------------------------------------------------

const Summary: React.FC<SummaryProps> = ({ total, title, icon }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary-2/20 bg-white p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Decoration */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-2/10" />
      <div className="absolute -bottom-8 -left-8 h-20 w-20 rounded-full bg-primary-1/5" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <p className="font-poppins text-sm font-medium text-[#737373]">{title}</p>

          <p className="mt-1 font-poppins text-4xl font-bold leading-none text-primary-1">{total}</p>

          <div className="mt-3 h-1 w-12 rounded-full bg-primary-2" />
        </div>

        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-1 to-primary-3 shadow-md">
          <Icon icon={icon} className="size-8 text-white" />
        </div>
      </div>
    </div>
  );
};

export default Summary;
