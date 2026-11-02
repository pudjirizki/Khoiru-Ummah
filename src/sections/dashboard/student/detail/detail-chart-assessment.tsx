import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';
import { Line, Radar } from 'react-chartjs-2';
import 'chart.js/auto';
import dayjs from 'dayjs';
// routes
import { paths } from '/src/routes/paths';
// lib
import { calculateFinalScore } from '/src/lib/calculations/scoring';
import { normalizationScoreToPercentage } from '/src/lib/calculations/normalization';
// interfaces
import { AnswerInterface } from '/src/interfaces/answer';
import { StudentInterface } from '/src/interfaces/student';
import { CriteriaInterface } from '/src/interfaces/criteria';
import { FinalFormInterface } from '/src/interfaces/final-form';
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
import { CurrentUserInterface, RoleUserType, UserInterface } from '/src/interfaces/user';
// components
import { Button } from '/src/components/button';
import { SelectField } from '/src/components/form';
//
import { FormAnswerMicroDetailsInterface } from '../view/student-detail-view';

// ----------------------------------------------------------------------

interface SeriesInterface {
  label: string;
  data: number[];
  color?: string;
}

interface LabelInterface {
  label: string;
  descriptions: string;
}

interface DetailChartAssessmentProps {
  currentUser: CurrentUserInterface | null;
  form: FinalFormInterface | undefined;
  users: UserInterface[];
  allCriteriasCache: CriteriaInterface[];
  formAssessments: FinalAssessmentInterface[];
  formAnswerMicroDetails: FormAnswerMicroDetailsInterface;
  selectedStudent: StudentInterface;
  selectedForm: FinalFormInterface | undefined;
  className?: string;
}

// ----------------------------------------------------------------------

const chartOptions = [
  {
    label: 'Radar',
    value: 'radar',
  },
  {
    label: 'Garis',
    value: 'line',
  },
];

const defaultPalette = ['#0ea5e9', '#ef4444', '#f59e0b', '#16a34a', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const hexToRgba = (hex: string, alpha = 0.15) => {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const genColor = (i: number) => {
  return defaultPalette[i] ?? `hsl(${(i * 47) % 360} 70% 50%)`;
};

// ----------------------------------------------------------------------

const DetailChartAssessment: React.FC<DetailChartAssessmentProps> = ({
  currentUser,
  form,
  users,
  allCriteriasCache,
  formAssessments,
  formAnswerMicroDetails,
  selectedStudent,
  selectedForm,
  className,
}) => {
  const [series, setSeries] = useState<SeriesInterface[]>([]);
  const [labels, setLabels] = useState<LabelInterface[]>([]);
  const [chartType, setChartType] = useState<'line' | 'radar'>('radar');

  const userMap = useMemo(() => new Map<string, UserInterface>((users ?? []).map((u) => [u.id, u])), [users]);

  const finalScore = useMemo(() => {
    let teacherScore = 0;
    let parentScore = 0;

    const getUser = (id: string) => userMap.get(id);

    formAssessments?.forEach((f) => {
      const user = getUser(f.userId);
      if (!user) return;

      if (user.role === 'teacher') {
        teacherScore = f.score ?? 0;
      } else if (user.role === 'parent') {
        parentScore = f.score ?? 0;
      }
    });

    return calculateFinalScore(teacherScore, parentScore);
  }, [formAssessments, userMap]);

  const isAwaitingAssessment = useMemo(() => {
    const dbUser = currentUser?.databaseUsers;
    if (!dbUser?.id || dbUser.role === 'admin') return false;

    const getUser = (id: string) => userMap.get(id);

    if (dbUser.role === 'teacher') {
      const hasTeacherAssessment = formAssessments?.some((f) => {
        const user = getUser(f.userId);
        return !!user && user.role === 'teacher';
      });

      return !hasTeacherAssessment;
    }

    const assessedUserIds = new Set(formAssessments?.map((a) => a.userId));
    return !assessedUserIds.has(dbUser.id);
  }, [currentUser?.databaseUsers, formAssessments, userMap]);

  // SERIES, LABELS
  useEffect(() => {
    if (!formAssessments || formAssessments?.length === 0) {
      setSeries([]);
      setLabels([]);
      return;
    }

    const criteriaMap = new Map<string, CriteriaInterface>((allCriteriasCache ?? []).map((c) => [c.id, c]));

    const presentCriteriaIds = Array.from(new Set(formAssessments?.flatMap((asmt) => asmt.answers.map((ans) => ans.criteriaId))));

    const criteriaWithMeta = presentCriteriaIds.map((id) => {
      const meta = criteriaMap.get(id);
      return {
        id,
        title: meta?.title ?? id,
        description: meta?.description ?? '',
      };
    });

    criteriaWithMeta.sort((a, b) => {
      const cmp = a.title.localeCompare(b.title, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });

    const criteriaOrder = criteriaWithMeta.map((c) => c.id);

    const newLabels: LabelInterface[] = criteriaWithMeta.map((c) => ({
      label: c.description,
      descriptions: c.description,
    }));

    const newSeries: SeriesInterface[] = formAssessments?.map((asmt, idx) => {
      const user = userMap.get(asmt.userId);

      let roleLabel = '';
      if (user?.role === 'teacher') roleLabel = 'Guru';
      else if (user?.role === 'parent') roleLabel = 'Wali Siswa';
      else if (user?.role === 'admin') roleLabel = 'Admin';
      else roleLabel = user?.name ?? 'Unknown';

      const ansMap = new Map<string, AnswerInterface>(asmt.answers.map((a) => [a.criteriaId, a]));

      const data = criteriaOrder.map((cid) => {
        const ans = ansMap.get(cid);
        return typeof ans?.averagePoint === 'number' ? ans.averagePoint : 0;
      });

      return {
        label: roleLabel,
        data,
        color: defaultPalette[idx % defaultPalette.length],
      };
    });

    setLabels(newLabels);
    setSeries(newSeries);
  }, [formAssessments, users, allCriteriasCache, userMap]);

  const getUser = (id: string) => userMap.get(id);

  return (
    <div className={twMerge('w-full rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50', 'overflow-hidden', className)}>
      <div className="bg-gradient-to-r from-primary-1/10 via-white to-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center rounded-full bg-primary-1/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary-1">Detail Penilaian</div>

            <p className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{form?.title}</p>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 sm:text-[15px]">{form?.description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isAwaitingAssessment && (
              <Button component="RouterLink" href={paths.dashboard.form.input(form?.id || '')} className="w-full whitespace-nowrap sm:w-auto">
                Isi Formulir
              </Button>
            )}

            <div className="flex flex-col items-end gap-3">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
                {formAssessments?.length ?? 0} Penilaian
              </div>

              <RenderExport
                formAnswerMicroDetails={formAnswerMicroDetails}
                studentName={selectedStudent.name}
                studentIdentity={selectedStudent.identityNumber}
                classroomName={selectedStudent.class}
                formName={selectedForm?.title || ''}
                className="rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        {!formAssessments?.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <p className="text-base font-semibold text-slate-700">Belum ada penilaian</p>
            <p className="mt-1 text-sm text-slate-500">Data penilaian akan muncul setelah formulir diisi.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {formAssessments?.map((f, i) => <RenderScoreCard key={i} bgColor={series[i]?.color} role={getUser(f.userId)?.role} name={getUser(f.userId)?.name} score={f.score} />)}

              {series.length >= 2 && <RenderScoreCard name="Sistem" score={finalScore} />}
            </div>

            {/* NOTES */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-900">Catatan Penilaian</h3>
                <p className="text-sm text-slate-500">Catatan dari setiap penilai.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {formAssessments?.map((f, i) => {
                  const role = getUser(f.userId)?.role;
                  const name = getUser(f.userId)?.name;

                  const roleLabel = role === 'teacher' ? 'Guru' : role === 'parent' ? 'Wali Siswa' : 'Admin';

                  return (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{roleLabel}</p>
                          <p className="text-sm text-slate-500">{name}</p>
                        </div>

                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: series[i]?.color,
                          }}
                        />
                      </div>

                      <p className="text-sm leading-6 text-slate-700">{f.catatan?.trim() ? f.catatan : 'Tidak ada catatan.'}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900 sm:text-xl">Grafik Penilaian</p>
                  <p className="text-sm text-slate-500">Perbandingan hasil penilaian per kriteria.</p>
                </div>

                <SelectField
                  value={chartOptions.find((c) => c.value === chartType)}
                  onChange={(e) => setChartType(e?.value as 'line' | 'radar')}
                  options={chartOptions}
                  isSearchable={false}
                  containerClassname="w-full sm:w-fit"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                {chartType === 'line' && <RenderLineChart series={series} labels={labels} />}

                {chartType === 'radar' && <RenderRadarChart series={series} labels={labels} />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function RenderScoreCard({ role, bgColor = 'oklch(26.9% 0 0)', score, name = 'Pengguna' }: { role?: RoleUserType; bgColor?: string; score: number; name?: string }) {
  const ROLE_LABEL: Record<RoleUserType, string> = {
    admin: 'Admin',
    parent: 'Wali Siswa',
    teacher: 'Guru',
  };

  const label = role ? ROLE_LABEL[role] : '';

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={twMerge('relative flex min-h-[180px] w-full flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-lg', 'ring-1 ring-black/5')}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium opacity-90 sm:text-base">{role ? `Penilaian ${label}` : 'Skor Akhir'}</p>
          <p className="mt-1 text-xs opacity-75 sm:text-sm">Skor ter-normalisasi</p>
        </div>

        <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{role ? label : 'Sistem'}</div>
      </div>

      <div className="relative py-4 text-center">
        <p className="text-6xl font-bold tracking-tight sm:text-7xl">
          {normalizationScoreToPercentage(score)}
          <span className="ml-1 text-base font-medium tracking-normal opacity-90 sm:text-lg">/100</span>
        </p>
      </div>

      <div className="relative">
        <p className="truncate text-sm font-medium opacity-90 sm:text-base">Oleh: {name}</p>
      </div>
    </div>
  );
}

function RenderLineChart({ labels: labelsProp = [], series, className = '' }: { labels?: LabelInterface[]; series: SeriesInterface[]; className?: string }) {
  const labelsShort = useMemo(() => {
    if (labelsProp && labelsProp.length) return labelsProp.map((l) => l.label);
    const maxLen = Math.max(0, ...series.map((s) => s.data.length));
    return Array.from({ length: maxLen }, (_, i) => `Item ${i + 1}`);
  }, [labelsProp, series]);

  const datasets = useMemo(
    () =>
      series.map((s, idx) => {
        const color = s.color ?? genColor(idx);
        const padded = Array.from({ length: labelsShort.length }, (_, i) => s.data[i] ?? 0);
        return {
          label: s.label,
          data: padded,
          fill: false,
          tension: 0.35,
          borderWidth: 2.5,
          borderColor: color,
          backgroundColor: color,
          pointBackgroundColor: color,
          pointBorderColor: '#ffffff',
          pointRadius: series.length > 3 ? 3 : 5,
          pointHoverRadius: 6,
        };
      }),
    [series, labelsShort.length]
  );

  const data = useMemo(
    () => ({
      labels: labelsShort,
      datasets,
    }),
    [labelsShort, datasets]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10,
            padding: 16,
          },
          display: series.length > 0,
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items: any[]) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return labelsProp?.[idx]?.descriptions ?? labelsShort[idx] ?? '';
            },
            label: (context: any) => {
              const dsLabel = context.dataset?.label ?? '';
              const value = context.parsed?.y ?? context.parsed ?? context.raw ?? '';
              return `${dsLabel}: ${value}`;
            },
          },
        },
      },
      scales: {
        y: {
          min: 0,
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: {
            color: 'rgba(148, 163, 184, 0.18)',
          },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
          },
        },
      },
    }),
    [series.length, labelsProp, labelsShort]
  );

  return (
    <div className={twMerge('h-[320px] w-full self-center sm:h-[360px]', className)}>
      <Line data={data} options={options} />
    </div>
  );
}

function RenderRadarChart({ labels: labelsProp = [], series, className = '' }: { labels?: LabelInterface[]; series: SeriesInterface[]; className?: string }) {
  const labelsShort = useMemo(() => (labelsProp.length ? labelsProp.map((l) => l.label) : []), [labelsProp]);

  const datasets = useMemo(
    () =>
      series.map((s, idx) => {
        const color = s.color ?? genColor(idx);
        const padded = Array.from({ length: labelsShort.length }, (_, i) => s.data[i] ?? 0);
        return {
          label: s.label,
          data: padded,
          backgroundColor: hexToRgba(color, 0.18),
          borderColor: color,
          borderWidth: 2,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointRadius: 4,
          fill: true,
        };
      }),
    [series, labelsShort.length]
  );

  const data = useMemo(
    () => ({
      labels: labelsShort,
      datasets,
    }),
    [labelsShort, datasets]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10,
            padding: 16,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items: any[]) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return labelsProp?.[idx]?.descriptions ?? labelsShort[idx] ?? '';
            },
            label: (ctx: any) => {
              const dsLabel = ctx.dataset?.label ?? '';
              const val = ctx.formattedValue ?? ctx.parsed ?? ctx.raw ?? '';
              return `${dsLabel}: ${val}`;
            },
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            backdropColor: 'transparent',
            color: '#64748b',
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
          angleLines: { color: 'rgba(0,0,0,0.08)' },
          pointLabels: {
            font: { size: 11 },
            color: '#334155',
          },
        },
      },
    }),
    [labelsProp, labelsShort]
  );

  return (
    <div className={twMerge('h-[340px] w-full self-center sm:h-[400px]', className)}>
      <Radar data={data} options={options} />
    </div>
  );
}

function RenderExport({
  formAnswerMicroDetails,
  studentName,
  classroomName,
  studentIdentity,
  formName,
  className,
}: {
  formAnswerMicroDetails: FormAnswerMicroDetailsInterface;
  studentName: string;
  classroomName: string;
  studentIdentity: string;
  formName: string;
  className?: string;
}) {
  const exportToExcel = useCallback(() => {
    const teacherAnswers = formAnswerMicroDetails.teacher ?? [];
    const parentAnswers = formAnswerMicroDetails.parent ?? [];

    const detailRows: Record<string, unknown>[] = [];

    teacherAnswers.forEach((teacherCriteria) => {
      const parentCriteria = parentAnswers.find((p) => p.criteriaId === teacherCriteria.criteriaId);

      teacherCriteria.microDetails.forEach((teacherQuestion) => {
        const parentQuestion = parentCriteria?.microDetails.find((p) => p.questionId === teacherQuestion.questionId);

        detailRows.push({
          Kriteria: teacherCriteria.criteriaName,
          Pertanyaan: teacherQuestion.questionName,

          'Nilai Guru': teacherQuestion.point,
          'Predikat Guru': teacherQuestion.pointName,

          'Nilai Wali Siswa': parentQuestion?.point ?? '',
          'Predikat Wali Siswa': parentQuestion?.pointName ?? '',
        });
      });
    });

    const infoRows = [
      {
        Field: 'Nama Siswa',
        Value: studentName,
      },
      {
        Field: 'NIS',
        Value: studentIdentity,
      },
      {
        Field: 'Kelas',
        Value: classroomName,
      },
      {
        Field: 'Formulir',
        Value: formName,
      },
      {
        Field: 'Tanggal Ekspor',
        Value: dayjs().format('DD/MM/YYYY HH:mm'),
      },
    ];

    const workbook = XLSX.utils.book_new();

    const infoWorksheet = XLSX.utils.json_to_sheet(infoRows);

    infoWorksheet['!cols'] = [{ wch: 30 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(workbook, infoWorksheet, 'Informasi');

    const detailWorksheet = XLSX.utils.json_to_sheet(detailRows);

    detailWorksheet['!cols'] = [
      { wch: 35 }, // Kriteria
      { wch: 90 }, // Pertanyaan
      { wch: 12 }, // Nilai Guru
      { wch: 20 }, // Predikat Guru
      { wch: 15 }, // Nilai Wali Siswa
      { wch: 20 }, // Predikat Wali Siswa
    ];

    XLSX.utils.book_append_sheet(workbook, detailWorksheet, 'Detail Penilaian');

    XLSX.writeFile(workbook, `detail-penilaian-${studentName}-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  }, [formAnswerMicroDetails.teacher, formAnswerMicroDetails.parent, studentName, studentIdentity, classroomName, formName]);

  return (
    <Button onClick={exportToExcel} variant="outlined" className={twMerge('flex w-full flex-row items-center justify-center gap-1 text-sm', className)}>
      <Icon icon="lets-icons:export-fill" className="size-4" />
      <span>Ekspor</span>
    </Button>
  );
}

export default DetailChartAssessment;
