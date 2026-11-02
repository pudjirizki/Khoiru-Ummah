import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { twMerge } from 'tailwind-merge';
// interfaces
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
import { FinalFormInterface } from '/src/interfaces/final-form';
import { StudentInterface } from '/src/interfaces/student';
import { UserInterface } from '/src/interfaces/user';
// lib
import { calculateFinalScore } from '/src/lib/calculations/scoring';
import { normalizationScoreToPercentage } from '/src/lib/calculations/normalization';

// ----------------------------------------------------------------------

interface HistoryAssessmentProps {
  student: StudentInterface | null;
  forms: FinalFormInterface[];
  assessments: FinalAssessmentInterface[];
  users: UserInterface[];
  className?: string;
}

interface HistoryEntry {
  formId: string;
  formTitle: string;
  classLabel: string;
  finalScore: number;
  teacherScore: number;
  parentScore: number;
  createdAt: number;
}

interface HistoryClassGroup {
  classLabel: string;
  totalScore: number;
  entries: HistoryEntry[];
}

// ----------------------------------------------------------------------

const classCollator = new Intl.Collator('id', {
  numeric: true,
  sensitivity: 'base',
});

const getClassLabel = (entry: HistoryEntry) => (entry.classLabel ? `Kelas ${entry.classLabel}` : 'Kelas -');

// ----------------------------------------------------------------------

const HistoryAssessment: React.FC<HistoryAssessmentProps> = ({ student, forms, assessments, users, className }) => {
  const userMap = useMemo(() => new Map<string, UserInterface>((users ?? []).map((user) => [user.id, user])), [users]);

  const historyEntries = useMemo<HistoryEntry[]>(() => {
    if (!student?.id) return [];

    const formMap = new Map<string, FinalFormInterface>((forms ?? []).map((form) => [form.id, form]));
    const studentAssessments = assessments.filter((assessment) => assessment.studenId === student.id);

    const groupedAssessments = studentAssessments.reduce<Map<string, FinalAssessmentInterface[]>>((acc, assessment) => {
      const current = acc.get(assessment.formId) ?? [];
      current.push(assessment);
      acc.set(assessment.formId, current);
      return acc;
    }, new Map<string, FinalAssessmentInterface[]>());

    return Array.from(groupedAssessments.entries())
      .map(([formId, formAssessments]) => {
        const teacherAssessment = formAssessments.find((assessment) => userMap.get(assessment.userId)?.role === 'teacher');
        const parentAssessment = formAssessments.find((assessment) => userMap.get(assessment.userId)?.role === 'parent');

        const form = formMap.get(formId);
        const finalScore = calculateFinalScore(teacherAssessment?.score ?? 0, parentAssessment?.score ?? 0);

        const classLabel = formAssessments.find((assessment) => assessment.studentClass)?.studentClass ?? student.class ?? form?.class?.[0] ?? '-';
        const createdAtSource = formAssessments
          .map((assessment) => assessment.createdAt)
          .map((value) => (value instanceof Date ? value.getTime() : new Date(value).getTime()))
          .sort((a, b) => b - a)[0];

        return {
          formId,
          formTitle: form?.title ?? 'Formulir',
          classLabel,
          finalScore,
          teacherScore: teacherAssessment?.score ?? 0,
          parentScore: parentAssessment?.score ?? 0,
          createdAt: createdAtSource || 0,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [assessments, forms, student?.class, student?.id, userMap]);

  const classGroups = useMemo<HistoryClassGroup[]>(() => {
    const map = new Map<string, HistoryClassGroup>();

    historyEntries.forEach((entry) => {
      const current = map.get(entry.classLabel) ?? {
        classLabel: entry.classLabel,
        totalScore: 0,
        entries: [],
      };

      current.totalScore += entry.finalScore;
      current.entries.push(entry);
      map.set(entry.classLabel, current);
    });

    return Array.from(map.values()).sort((a, b) => classCollator.compare(a.classLabel, b.classLabel));
  }, [historyEntries]);

  const chartData = useMemo(
    () => ({
      labels: classGroups.map((group) => getClassLabel({ classLabel: group.classLabel } as HistoryEntry)),
      datasets: [
        {
          label: 'Akumulasi Skor Final',
          data: classGroups.map((group) => Number(group.totalScore.toFixed(2))),
          backgroundColor: 'rgba(21, 128, 61, 0.18)',
          borderColor: '#15803D',
          borderWidth: 2,
          borderRadius: 12,
          maxBarThickness: 64,
        },
      ],
    }),
    [classGroups]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => `Total skor: ${context.parsed.y?.toFixed?.(2) ?? context.parsed.y}`,
            afterLabel: (context: any) => {
              const group = classGroups[context.dataIndex];
              if (!group) return [];

              return group.entries.map((entry) => `- ${entry.formTitle}: ${normalizationScoreToPercentage(entry.finalScore)}`);
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) => normalizationScoreToPercentage(Number(value)),
          },
        },
      },
    }),
    [classGroups]
  );

  if (!historyEntries.length) {
    return (
      <div className={twMerge('w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-lg drop-shadow-lg', className)}>
        <p className="text-lg font-semibold text-slate-900">Riwayat Penilaian</p>
        <p className="mt-1 text-sm text-slate-500">Belum ada riwayat penilaian untuk siswa ini.</p>
      </div>
    );
  }

  return (
    <div className={twMerge('w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-lg drop-shadow-lg', className)}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">Riwayat Penilaian</p>
          <p className="text-sm text-slate-500">Akumulasi skor final dari setiap form berdasarkan kelas saat penilaian dibuat.</p>
        </div>

        <div className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          {historyEntries.length} Form | {classGroups.length} Kelas
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="h-80 w-full">
          <Bar data={chartData} options={chartOptions as any} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {classGroups.map((group) => (
          <div key={group.classLabel} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{getClassLabel({ classLabel: group.classLabel } as HistoryEntry)}</p>
                <p className="text-xs text-slate-500">{group.entries.length} form</p>
              </div>

              <div className="rounded-full bg-primary-1/10 px-3 py-1 text-xs font-semibold text-primary-1">{normalizationScoreToPercentage(group.totalScore)}</div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {group.entries.map((entry) => (
                <div key={entry.formId} className="rounded-xl border border-white/70 bg-white px-3 py-2 shadow-sm">
                  <p className="text-sm font-medium text-slate-800">{entry.formTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Final: {normalizationScoreToPercentage(entry.finalScore)} | Guru {normalizationScoreToPercentage(entry.teacherScore)} | Wali {normalizationScoreToPercentage(entry.parentScore)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryAssessment;
