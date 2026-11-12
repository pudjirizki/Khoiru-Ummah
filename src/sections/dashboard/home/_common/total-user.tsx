import React, { useEffect, useMemo, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { twMerge } from 'tailwind-merge';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
// components
import { SelectField } from '/src/components/form';

// ----------------------------------------------------------------------

interface TotalUserProps {
  users: Array<{
    role?: string | null;
  }>;
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

const ROLE_LABELS = ['Admin', 'Guru', 'Wali Siswa'];

const ROLE_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

// ----------------------------------------------------------------------

const TotalUser: React.FC<TotalUserProps> = ({ users, className }) => {
  const [dataChart, setDataChart] = useState<number[]>(new Array(3).fill(0));

  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // GET DATA CHART
  useEffect(() => {
    const counts = new Array(3).fill(0);

    (users || []).forEach((user) => {
      const role = user.role?.toLowerCase();

      if (role === 'admin') {
        counts[0]++;
      }

      if (role === 'teacher') {
        counts[1]++;
      }

      if (role === 'parent') {
        counts[2]++;
      }
    });

    setDataChart(counts);
  }, [users]);

  const data = useMemo(
    () => ({
      labels: ROLE_LABELS,
      datasets: [
        {
          label: 'Jumlah User',
          data: dataChart,
          backgroundColor: ROLE_COLORS,
          hoverOffset: 6,
        },
      ],
    }),
    [dataChart]
  );

  const barData = useMemo(
    () => ({
      labels: ROLE_LABELS,
      datasets: [
        {
          label: 'Jumlah User',
          data: dataChart,
          backgroundColor: ROLE_COLORS,
          borderRadius: 8,
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
        legend: {
          position: 'bottom' as const,
        },
        tooltip: {
          enabled: true,
        },
      },
    }),
    []
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    }),
    []
  );

  return (
    <div className={twMerge(`w-full rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6 shadow-md`, className)}>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-poppins text-sm font-medium uppercase tracking-wider text-slate-500">Statistik</p>

          <h3 className="font-poppins text-2xl font-bold text-primary-1">Jumlah Pengguna</h3>

          <p className="mt-1 font-inter text-sm text-slate-500">Total {dataChart.reduce((a, b) => a + b, 0)} pengguna terdaftar</p>
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

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#3B82F6]/10 p-3">
          <p className="text-xs text-slate-500">Admin</p>
          <p className="font-poppins text-xl font-bold text-[#3B82F6]">{dataChart[0]}</p>
        </div>

        <div className="rounded-xl bg-[#10B981]/10 p-3">
          <p className="text-xs text-slate-500">Guru</p>
          <p className="font-poppins text-xl font-bold text-[#10B981]">{dataChart[1]}</p>
        </div>

        <div className="rounded-xl bg-[#F59E0B]/10 p-3">
          <p className="text-xs text-slate-500">Wali Siswa</p>
          <p className="font-poppins text-xl font-bold text-[#F59E0B]">{dataChart[2]}</p>
        </div>
      </div>

      <div className={twMerge(`rounded-2xl border border-slate-100 bg-white p-4`, chartType === 'bar' ? 'h-[340px]' : 'h-[420px] md:mx-auto md:w-[430px]')}>
        {chartType === 'pie' && <Pie data={data} options={pieOptions} />}

        {chartType === 'bar' && <Bar data={barData} options={barOptions} />}
      </div>
    </div>
  );
};

export default TotalUser;
