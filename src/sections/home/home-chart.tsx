import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import 'chart.js/auto';
// components
import { Image } from '/src/components/image';

// ----------------------------------------------------------------------

const series = [
  { label: 'Guru', data: [1, 2, 3, 4, 3], color: '#0ea5e9' },
  { label: 'Wali Siswa', data: [4, 3, 2, 1, 2], color: '#ef4444' },
];

const labels = [
  { label: 'Kedisiplinan', descriptions: 'Kedisiplinan' },
  { label: 'Kerjasama & Sosialisasi', descriptions: 'Kerjasama & Sosialisasi' },
  { label: 'Sikap & Etika', descriptions: 'Sikap & Etika' },
  { label: 'Partisipasi & Motivasi Belajar', descriptions: 'Partisipasi & Motivasi Belajar' },
  { label: 'Kemandirian & Tanggung Jawab', descriptions: 'Kemandirian & Tanggung Jawab' },
];

// helper untuk konversi hex -> rgba
const hexToRgba = (hex: string, alpha = 1) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ----------------------------------------------------------------------

const HomeChart: React.FC = () => {
  const chartLabels = useMemo(() => labels.map((l) => l.label), []);

  const maxValue = useMemo(() => {
    const flat = series.flatMap((s) => s.data);
    return flat.length ? Math.max(...flat) : 5;
  }, []);

  const datasets = useMemo(
    () =>
      series.map((s) => ({
        label: s.label,
        data: s.data,
        backgroundColor: hexToRgba(s.color, 0.18),
        borderColor: s.color,
        borderWidth: 2,
        pointBackgroundColor: s.color,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: s.color,
        fill: true,
      })),
    []
  );

  const data = useMemo(
    () => ({
      labels: chartLabels,
      datasets,
    }),
    [chartLabels, datasets]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items: any[]) => {
              const idx = items[0]?.dataIndex ?? 0;
              return labels[idx]?.label ?? chartLabels[idx];
            },
            label: (context: any) => {
              const datasetLabel = context.dataset.label ?? '';
              const value = context.formattedValue;
              return `${datasetLabel}: ${value}`;
            },
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            max: Math.ceil(maxValue),
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
          angleLines: { color: 'rgba(0,0,0,0.06)' },
          pointLabels: { font: { size: 11 } },
        },
      },
    }),
    [chartLabels, maxValue]
  );

  return (
    <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">
      <div className="flex flex-col-reverse items-center justify-between gap-10 lg:flex-row">
        <div className="rounded-[32px] bg-gradient-to-br from-primary-1 to-primary-3 p-8 text-white lg:p-12">
          <p className="text-center text-4xl font-semibold md:text-[42px]">Visualisasi Perkembangan Siswa</p>
          <p className="text-center font-opensans lg:text-left">Bandingkan hasil observasi guru dan wali murid secara visual sehingga perubahan perilaku siswa dapat dipantau dengan lebih mudah.</p>
        </div>

        <div className="h-[262px] w-[295px]">
          <Image src="/assets/images/image-5.png" alt="data-visual" />
        </div>
      </div>

      <div className="h-[420px]">
        <Radar data={data} options={options} />
      </div>
    </div>
  );
};

export default HomeChart;
