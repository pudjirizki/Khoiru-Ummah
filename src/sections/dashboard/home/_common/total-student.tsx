import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { twMerge } from 'tailwind-merge';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
// components
import { SelectField } from '/src/components/form';

// ----------------------------------------------------------------------

interface TotalStudentProps {
  students: StudentInterface[];
  className?: string;
}

// ----------------------------------------------------------------------

const chartOptions = [
  {
    label: 'Pie',
    value: 'pie',
  },
  {
    label: 'Batang',
    value: 'bar',
  },
];

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

// ----------------------------------------------------------------------

const TotalStudent: React.FC<TotalStudentProps> = ({ students, className }) => {
  const [dataChart, setDataChart] = useState<number[]>(new Array(6).fill(0));

  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // GET DATA CHART
  useEffect(() => {
    const counts = new Array(6).fill(0);
    (students || []).forEach((s) => {
      const cls = Number(s.class);
      if (!Number.isNaN(cls) && cls >= 1 && cls <= 6) counts[cls - 1]++;
    });
    setDataChart(counts);
  }, [students]);

  const data = useMemo(
    () => ({
      labels: ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'],
      datasets: [
        {
          label: 'Jumlah Siswa',
          data: dataChart,
          backgroundColor: colors,
          hoverOffset: 8,
        },
      ],
    }),
    [dataChart]
  );

  const barData = useMemo(
    () => ({
      labels: ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'],
      datasets: [
        {
          label: 'Jumlah Siswa',
          data: dataChart,
          backgroundColor: colors,
          borderRadius: 10,
        },
      ],
    }),
    [dataChart]
  );

  const pieOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: { enabled: true },
      },
    }),
    []
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' as const },
        tooltip: { enabled: true },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
        x: {
          grid: { display: false },
        },
      },
    }),
    []
  );

  return (
    <div className={twMerge(`w-full rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6 shadow-md`, className)}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-poppins text-sm font-medium uppercase tracking-wider text-slate-500">Statistik</p>

          <h3 className="font-poppins text-2xl font-bold text-primary-1">Jumlah Siswa</h3>

          <p className="mt-1 font-inter text-sm text-slate-500">Total {students.length} siswa terdaftar</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <SelectField
            value={chartOptions.find((c) => c.value === chartType)}
            onChange={(e) => setChartType(e?.value as 'pie' | 'bar')}
            options={chartOptions}
            isSearchable={false}
            containerClassname="min-w-[140px]"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {dataChart.map((total, index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="text-xs text-slate-500">Kelas {index + 1}</p>

            <p className="font-poppins text-xl font-bold text-primary-1">{total}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className={twMerge(`rounded-2xl border border-slate-100 bg-white p-4`, chartType === 'bar' ? 'h-[340px]' : 'h-[420px] md:mx-auto md:w-[430px]')}>
        {chartType === 'pie' && <Pie data={data} options={pieOptions} />}

        {chartType === 'bar' && <Bar data={barData} options={barOptions} />}
      </div>
    </div>
  );
};

export default TotalStudent;
