import React from 'react';

// ----------------------------------------------------------------------

const statistics = [
  {
    value: '100+',
    label: 'Form Penilaian',
  },
  {
    value: '500+',
    label: 'Data Observasi',
  },
  {
    value: '24/7',
    label: 'Akses Online',
  },
  {
    value: '100%',
    label: 'Transparan',
  },
];

// ----------------------------------------------------------------------

const HomeStatistics: React.FC = () => {
  return (
    <section className="py-20">
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {statistics.map((item, index) => (
          <div key={index} className="group rounded-3xl border border-neutral-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-xl lg:p-8">
            <p className="font-poppins text-3xl font-bold text-primary-1 lg:text-5xl">{item.value}</p>

            <p className="mt-3 font-opensans text-sm text-neutral-600 lg:text-base">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomeStatistics;
