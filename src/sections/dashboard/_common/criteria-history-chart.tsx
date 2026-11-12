import React, { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
// interfaces
import { CriteriaHistoryEntry } from '/src/lib/calculations/criteria-history';
// lib
import { normalizationScoreToPercentage } from '/src/lib/calculations/normalization';

interface CriteriaHistoryChartProps {
  criteriaEntries: CriteriaHistoryEntry[];
}

const getScoreLabel = (score: number | null) => (score === null ? 'Belum diisi' : String(normalizationScoreToPercentage(score)));

const getCriteriaLabel = (entry: CriteriaHistoryEntry) => entry.description.trim() || entry.title;

const wrapLabel = (label: string) => {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    if (line && `${line} ${word}`.length > 15) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  });

  if (line) lines.push(line);
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = `${lines[2].slice(0, 12)}...`;
  }

  return lines;
};

const CriteriaHistoryChart: React.FC<CriteriaHistoryChartProps> = ({ criteriaEntries }) => {
  const formOptions = useMemo(() => {
    const forms = new Map<string, string>();
    criteriaEntries.forEach((entry) => forms.set(entry.formId, entry.formTitle));
    return Array.from(forms, ([id, title]) => ({ id, title }));
  }, [criteriaEntries]);

  const [selectedFormId, setSelectedFormId] = useState('');

  useEffect(() => {
    if (!formOptions.length) {
      setSelectedFormId('');
      return;
    }

    if (!formOptions.some((form) => form.id === selectedFormId)) {
      setSelectedFormId(formOptions[0].id);
    }
  }, [formOptions, selectedFormId]);

  const selectedEntries = useMemo(() => criteriaEntries.filter((entry) => entry.formId === selectedFormId), [criteriaEntries, selectedFormId]);

  const chartData = useMemo(
    () => ({
      labels: selectedEntries.map((entry) => wrapLabel(getCriteriaLabel(entry))),
      datasets: [
        {
          label: 'Rata-rata nilai',
          data: selectedEntries.map((entry) => (entry.finalScore === null ? null : Number(entry.finalScore.toFixed(2)))),
          backgroundColor: 'rgba(21, 128, 61, 0.18)',
          borderColor: '#15803D',
          borderWidth: 2,
          borderRadius: 8,
          barThickness: 24,
          maxBarThickness: 28,
        },
      ],
    }),
    [selectedEntries]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'x' as const,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: any[]) => {
              const entry = selectedEntries[items[0]?.dataIndex];
              return entry ? getCriteriaLabel(entry) : '';
            },
            label: (context: any) => `Rata-rata nilai: ${getScoreLabel(selectedEntries[context.dataIndex]?.finalScore ?? null)}`,
            afterLabel: (context: any) => {
              const entry = selectedEntries[context.dataIndex];
              if (!entry) return [];

              return [
                `Guru: ${getScoreLabel(entry.teacherScore)}`,
                `Wali: ${getScoreLabel(entry.parentScore)}`,
                ...entry.questions.map(
                  (question) => `- ${question.title}: ${getScoreLabel(question.finalScore)} (Guru ${getScoreLabel(question.teacherScore)}, Wali ${getScoreLabel(question.parentScore)})`
                ),
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            font: { size: 11 },
          },
        },
        y: {
          beginAtZero: true,
          max: 4,
          ticks: { callback: (value: string | number) => normalizationScoreToPercentage(Number(value)) },
        },
      },
    }),
    [selectedEntries]
  );

  if (!criteriaEntries.length) {
    return <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Belum ada data kriteria pada penilaian siswa ini.</p>;
  }

  const chartWidth = Math.max(selectedEntries.length * 88, 320);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="criteria-history-form" className="mb-2 block text-sm font-semibold text-slate-700">
            Pilih formulir
          </label>
          <select
            id="criteria-history-form"
            value={selectedFormId}
            onChange={(event) => setSelectedFormId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-primary-1 focus:ring-2 focus:ring-primary-1/15"
          >
            {formOptions.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="font-semibold text-slate-800">{selectedEntries.length}</span> kriteria
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
        <p className="mb-1 text-base font-semibold text-slate-800">Rata-rata nilai per kriteria</p>
        <p className="mb-4 text-sm text-slate-500">
          Nilai kriteria adalah rata-rata nilai pertanyaan di dalamnya. Jika guru dan wali sudah mengisi, nilai keduanya digabung (guru 60%, wali 40%); jika baru satu yang mengisi, nilai yang tersedia
          digunakan. Buka detail untuk melihat nilai setiap pertanyaan.
        </p>
        <div className="overflow-x-auto rounded-xl bg-white p-3 sm:p-4">
          <div style={{ minWidth: chartWidth, height: 380 }}>
            <Bar data={chartData} options={chartOptions as any} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {selectedEntries.map((entry) => (
          <details key={entry.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{getCriteriaLabel(entry)}</p>
                <p className="mt-1 text-xs text-slate-500">Klik untuk melihat nilai setiap pertanyaan</p>
              </div>
              <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-800">{getScoreLabel(entry.finalScore)}</span>
            </summary>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              <p className="text-sm font-medium text-slate-700">Rincian nilai pertanyaan</p>
              <p className="text-xs text-slate-500">
                Rata-rata kriteria | Guru {getScoreLabel(entry.teacherScore)} | Wali {getScoreLabel(entry.parentScore)}
              </p>
              {entry.questions.length === 0 && <p className="text-sm text-slate-500">Tidak ada pertanyaan pada kriteria ini.</p>}
              {entry.questions.map((question) => (
                <div key={question.id} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-sm leading-5 text-slate-700">{question.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Nilai {getScoreLabel(question.finalScore)} | Guru {getScoreLabel(question.teacherScore)} | Wali {getScoreLabel(question.parentScore)}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default CriteriaHistoryChart;
