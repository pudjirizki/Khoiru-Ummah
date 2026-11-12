  import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Pie, getElementAtEvent } from 'react-chartjs-2';
import 'chart.js/auto';
// interfaces
import { CriteriaHistoryEntry } from '/src/lib/calculations/criteria-history';

interface CriteriaHistoryClassGroup {
  classLabel: string;
  entries: {
    formId: string;
    formTitle: string;
    criteriaScores: CriteriaHistoryEntry[];
  }[];
}

interface CriteriaHistoryDetailChartProps {
  classGroups: CriteriaHistoryClassGroup[];
  selectedClass: string;
  setSelectedClass: React.Dispatch<React.SetStateAction<string>>;
  selectedFormId: string;
  setSelectedFormId: React.Dispatch<React.SetStateAction<string>>;
}

const palette = ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#9333EA', '#0891B2', '#EA580C', '#4F46E5'];
const getCriteriaLabel = (entry: CriteriaHistoryEntry) => entry.description.trim() || entry.title;

const CriteriaHistoryDetailChart: React.FC<CriteriaHistoryDetailChartProps> = ({ classGroups, selectedClass, setSelectedClass, selectedFormId, setSelectedFormId }) => {
  const [showCriteria, setShowCriteria] = useState(false);
  const selectedClassGroup = useMemo(() => classGroups.find((group) => group.classLabel === selectedClass), [classGroups, selectedClass]);

  const forms = selectedClassGroup?.entries ?? [];
  const selectedForm = forms.find((entry) => entry.formId === selectedFormId) ?? forms[0];
  const criteriaEntries = useMemo(() => selectedForm?.criteriaScores.filter((entry) => entry.finalScore !== null) ?? [], [selectedForm]);
  const pieRef = React.useRef<any>(null);

  useEffect(() => {
    if (selectedForm && selectedForm.formId !== selectedFormId) {
      setSelectedFormId(selectedForm.formId);
    }
  }, [selectedForm, selectedFormId, setSelectedFormId]);

  useEffect(() => {
    setShowCriteria(false);
  }, [selectedClass, selectedForm?.formId]);

  const chartData = useMemo(
    () => ({
      labels: criteriaEntries.map(getCriteriaLabel),
      datasets: [
        {
          data: criteriaEntries.map((entry) => entry.finalScore),
          backgroundColor: criteriaEntries.map((_, index) => palette[index % palette.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    }),
    [criteriaEntries]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: any[]) => {
              const entry = criteriaEntries[items[0]?.dataIndex];
              return entry ? getCriteriaLabel(entry) : '';
            },
            label: (context: any) => `Rata-rata nilai: ${Number(context.raw).toFixed(2)}`,
            afterLabel: (context: any) => {
              const entry = criteriaEntries[context.dataIndex];
              if (!entry) return [];

              return entry.questions.map((question) => `- ${question.title}: ${question.finalScore === null ? 'Belum diisi' : question.finalScore.toFixed(2)}`);
            },
          },
        },
      },
    }),
    [criteriaEntries]
  );

  const handleChartClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pieRef.current || !selectedForm) return;

    const elements = getElementAtEvent(pieRef.current, event);
    if (elements.length) setSelectedFormId(selectedForm.formId);
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="criteria-detail-class" className="mb-2 block text-sm font-medium text-slate-700">
            Pilih Kelas
          </label>
          <select
            id="criteria-detail-class"
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-1"
          >
            {classGroups.map((group) => (
              <option key={group.classLabel} value={group.classLabel}>
                {group.classLabel ? `Kelas ${group.classLabel}` : 'Kelas -'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="criteria-detail-form" className="mb-2 block text-sm font-medium text-slate-700">
            Pilih Formulir
          </label>
          <select
            id="criteria-detail-form"
            value={selectedForm?.formId ?? ''}
            onChange={(event) => setSelectedFormId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-1"
          >
            {forms.map((form) => (
              <option key={form.formId} value={form.formId}>
                {form.formTitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!criteriaEntries.length ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Belum ada nilai kriteria untuk formulir ini.</p>
      ) : (
        <>
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
            <p className="mb-1 text-center text-sm font-semibold text-slate-800">{selectedForm?.formTitle}</p>
            <p className="mb-3 text-center text-xs text-slate-500">Setiap irisan menunjukkan rata-rata nilai satu kriteria.</p>
            <div className="mx-auto h-[360px] w-full max-w-[900px]">
              <Pie ref={pieRef} data={chartData} options={chartOptions} onClick={handleChartClick} />
            </div>
          </div>

          <div>
            <button
              type="button"
              aria-expanded={showCriteria}
              onClick={() => setShowCriteria((shown) => !shown)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary-1 hover:text-primary-1"
            >
              <span>{showCriteria ? 'Sembunyikan daftar kriteria' : `Lihat daftar kriteria (${criteriaEntries.length})`}</span>
              <Icon icon={showCriteria ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} />
            </button>

            {showCriteria && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {criteriaEntries.map((entry, index) => (
                  <details key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} aria-hidden="true" />
                        <span>{getCriteriaLabel(entry)}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-800">{entry.finalScore?.toFixed(2) ?? 'Belum diisi'}</span>
                    </summary>
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-sm font-medium text-slate-700">Rincian nilai pertanyaan</p>
                      {entry.questions.map((question) => (
                        <div key={question.id} className="rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-sm text-slate-700">{question.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Rata-rata {question.finalScore?.toFixed(2) ?? 'Belum diisi'} | Guru {question.teacherScore?.toFixed(2) ?? 'Belum diisi'} | Wali{' '}
                            {question.parentScore?.toFixed(2) ?? 'Belum diisi'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CriteriaHistoryDetailChart;
