import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Bar, Pie, getElementAtEvent } from 'react-chartjs-2';
import 'chart.js/auto';
import { twMerge } from 'tailwind-merge';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { UseFinalFormInterface } from '/src/hooks/use-final-form';
import { useDatabaseCriteria } from '/src/hooks/use-database-criteria';
import { UseFinalAssessmentInterface } from '/src/hooks/use-final-assessment';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
import { FinalFormInterface } from '/src/interfaces/final-form';
import { CurrentUserInterface, UserInterface } from '/src/interfaces/user';
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
// lib
import { calculateFinalScore } from '/src/lib/calculations/scoring';
import { normalizationScoreToPercentage } from '/src/lib/calculations/normalization';
// components
import { Button } from '/src/components/button';
// _common
import { CardSkeleton, ChartAssessment } from './_common';

// ----------------------------------------------------------------------

interface HomeAssessmentResultProps {
  currentUser: CurrentUserInterface | null;
  users: UserInterface[];
  forms: UseFinalFormInterface['allFinalFormsCache'];
  assessments: UseFinalAssessmentInterface['allFinalAssessmentsCache'];
  selectedStudent: StudentInterface | null;
  fetchFinalAssessmentById: UseFinalAssessmentInterface['fetchFinalAssessmentById'];
  fetchFinalFormById: UseFinalFormInterface['fetchFinalFormById'];
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
  averageScore: number;
  entries: HistoryEntry[];
}

interface PieChartEntry {
  formId: string;
  formTitle: string;
  finalScore: number;
}

const mergeUniqueForms = <T extends { id?: string }>(currentForms: T[], historyForms: T[]) => {
  const map = new Map<string, T>();

  [...currentForms, ...historyForms].forEach((form) => {
    if (form?.id) {
      map.set(form.id, form);
    }
  });

  return Array.from(map.values());
};

const classCollator = new Intl.Collator('id', {
  numeric: true,
  sensitivity: 'base',
});

const getClassLabel = (entry: HistoryEntry) => (entry.classLabel ? `Kelas ${entry.classLabel}` : 'Kelas -');

// ----------------------------------------------------------------------

const HomeAssessmentResult: React.FC<HomeAssessmentResultProps> = ({ currentUser, users, assessments, forms, selectedStudent, fetchFinalAssessmentById, fetchFinalFormById }) => {
  const [studentForms, setStudentForms] = useState<FinalFormInterface[]>([]);

  const [studentAssessments, setStudentAssessments] = useState<FinalAssessmentInterface[]>([]);

  const [selectedFormId, setSelectedFormId] = useState('');

  const { value: isLoadingValue, onTrue: showLoading, onFalse: hideLoading } = useBoolean(false);

  const { allCriteriasCache } = useDatabaseCriteria();

  // STUDENT FORMS, STUDENT ASSESSMENTS
  useEffect(() => {
    if (!selectedStudent?.id) {
      setStudentForms([]);
      setStudentAssessments([]);
      setSelectedFormId('');
      return;
    }

    const selectedStudentClass = selectedStudent.class;

    let isMounted = true;

    const fetchData = async () => {
      try {
        showLoading();

        const assefiltered = assessments.filter((a) => a.studenId === selectedStudent.id);
        const assessedFormIds = new Set(assefiltered.map((a) => a.formId));

        const currentClassForms = forms.filter((form) => form.class.includes(selectedStudentClass));
        const historyForms = forms.filter((form) => assessedFormIds.has(form.id));
        const formFiltered = mergeUniqueForms(currentClassForms, historyForms);

        const formResponses = await Promise.all(formFiltered.map((f) => fetchFinalFormById(f.id)));
        const asseResponses = await Promise.all(assefiltered.map((a) => fetchFinalAssessmentById(a.id)));

        const sorted = [...formResponses].sort((a, b) => {
          const dateA = new Date(((a as FinalFormInterface).createdAt as string).replace(' at ', ' '));
          const dateB = new Date(((b as FinalFormInterface).createdAt as string).replace(' at ', ' '));
          return dateB.getTime() - dateA.getTime();
        });

        if (isMounted) {
          setStudentForms(sorted as FinalFormInterface[]);
          setStudentAssessments(asseResponses as FinalAssessmentInterface[]);
          setSelectedFormId('');
        }
      } catch (error) {
        console.error(error);
      } finally {
        hideLoading();
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [assessments, fetchFinalAssessmentById, fetchFinalFormById, forms, hideLoading, selectedStudent?.class, selectedStudent?.id, showLoading]);

  const selectedForm = studentForms.find((form) => form.id === selectedFormId);

  if (!selectedStudent) return null;

  if (isLoadingValue) {
    return (
      <div className="mt-10">
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-6">
      <HomeHistoryAssessment student={selectedStudent} forms={studentForms} assessments={studentAssessments} users={users} selectedFormId={selectedFormId} setSelectedFormId={setSelectedFormId} />

      {selectedFormId && selectedForm && <ChartAssessment form={selectedForm} currentUser={currentUser} assessments={studentAssessments} users={users} allCriteriasCache={allCriteriasCache} />}
    </div>
  );
};

function HomeHistoryAssessment({
  student,
  forms,
  assessments,
  users,
  selectedFormId,
  setSelectedFormId,
  className,
}: {
  student: StudentInterface | null;
  forms: FinalFormInterface[];
  assessments: FinalAssessmentInterface[];
  users: UserInterface[];
  selectedFormId: string;
  setSelectedFormId: React.Dispatch<React.SetStateAction<string>>;
  className?: string;
}) {
  const userMap = useMemo(() => new Map<string, UserInterface>((users ?? []).map((user) => [user.id, user])), [users]);

  const [activeTab, setActiveTab] = useState<'average' | 'detail'>('average');

  const [selectedClass, setSelectedClass] = useState('');

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
    const map = new Map<string, Omit<HistoryClassGroup, 'averageScore'>>();

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

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        averageScore: group.entries.length ? group.totalScore / group.entries.length : 0,
      }))
      .sort((a, b) => classCollator.compare(a.classLabel, b.classLabel));
  }, [historyEntries]);

  useEffect(() => {
    if (!classGroups.length) {
      setSelectedClass('');
      return;
    }

    if (!selectedClass || !classGroups.some((group) => group.classLabel === selectedClass)) {
      setSelectedClass(classGroups[0].classLabel);
    }
  }, [classGroups, selectedClass]);

  const renderTabButton = (value: 'average' | 'detail', label: string) => {
    const active = activeTab === value;

    return (
      <button
        type="button"
        onClick={() => setActiveTab(value)}
        className={twMerge('rounded-full px-4 py-2 text-sm font-medium transition-all duration-200', active ? 'bg-primary-1 text-white shadow' : 'text-slate-600 hover:bg-slate-200')}
      >
        {label}
      </button>
    );
  };

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

      <div className="mb-5 flex justify-center">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {renderTabButton('average', 'Rata-rata per kelas')}
          {renderTabButton('detail', 'Rincian per form')}
        </div>
      </div>

      {activeTab === 'average' && <RenderAverageTab classGroups={classGroups} />}

      {activeTab === 'detail' && (
        <RenderDetailTab selectedClass={selectedClass} setSelectedClass={setSelectedClass} classGroups={classGroups} selectedFormId={selectedFormId} setSelectedFormId={setSelectedFormId} />
      )}
    </div>
  );
}

function RenderAverageTab({ classGroups }: { classGroups: HistoryClassGroup[] }) {
  const [pageByClass, setPageByClass] = useState<Record<string, number>>({});

  const chartData = useMemo(
    () => ({
      labels: classGroups.map((group) => getClassLabel({ classLabel: group.classLabel } as HistoryEntry)),
      datasets: [
        {
          label: 'Rata-rata Skor Final',
          data: classGroups.map((group) => Number(group.averageScore.toFixed(2))),
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
            label: (context: any) => {
              const group = classGroups[context.dataIndex];

              return [`Rata-rata : ${normalizationScoreToPercentage(group.averageScore)}`, `Total : ${normalizationScoreToPercentage(group.totalScore)}`];
            },

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

  const ITEMS_PER_PAGE = 2;

  const getCurrentPage = (classLabel: string) => {
    return pageByClass[classLabel] ?? 1;
  };

  const handleChangePage = (classLabel: string, page: number, totalPage: number) => {
    if (page < 1 || page > totalPage) return;

    setPageByClass((prev) => ({
      ...prev,
      [classLabel]: page,
    }));
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="h-80 w-full">
          <Bar data={chartData} options={chartOptions as any} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {classGroups.map((group) => {
          const currentPage = getCurrentPage(group.classLabel);

          const totalPage = Math.ceil(group.entries.length / ITEMS_PER_PAGE);

          const visibleEntries = group.entries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

          return (
            <div key={group.classLabel} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{getClassLabel({ classLabel: group.classLabel } as HistoryEntry)}</p>
                  <p className="text-xs text-slate-500">{group.entries.length} form</p>
                </div>

                <span className="rounded-full bg-primary-1/10 px-3 py-1 text-xs font-semibold text-primary-1">Rata-rata {normalizationScoreToPercentage(group.averageScore)}</span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {visibleEntries.map((entry) => (
                  <div key={entry.formId} className="rounded-xl border border-white/70 bg-white px-3 py-2 shadow-sm">
                    <p className="text-sm font-medium text-slate-800">{entry.formTitle}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Final: {normalizationScoreToPercentage(entry.finalScore)} | Guru {normalizationScoreToPercentage(entry.teacherScore)} | Wali {normalizationScoreToPercentage(entry.parentScore)}
                    </p>
                  </div>
                ))}
              </div>

              {totalPage > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                  <Button variant="gost" onClick={() => handleChangePage(group.classLabel, currentPage - 1, totalPage)} disabled={currentPage === 1} className="rounded-lg px-3 py-1">
                    <Icon icon="ic:round-arrow-back-ios" width={18} />
                  </Button>

                  <span className="text-xs font-medium text-slate-500">
                    {currentPage} / {totalPage}
                  </span>

                  <Button variant="gost" onClick={() => handleChangePage(group.classLabel, currentPage + 1, totalPage)} disabled={currentPage === totalPage} className="rounded-lg px-3 py-1">
                    <Icon icon="ic:round-arrow-forward-ios" width={18} />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function RenderDetailTab({
  selectedClass,
  setSelectedClass,
  selectedFormId,
  setSelectedFormId,
  classGroups,
}: {
  selectedClass: string;
  setSelectedClass: React.Dispatch<React.SetStateAction<string>>;
  selectedFormId: string;
  setSelectedFormId: React.Dispatch<React.SetStateAction<string>>;
  classGroups: HistoryClassGroup[];
}) {
  const pieChartRef = useRef<any>(null);

  const selectedClassGroup = useMemo(() => {
    return classGroups.find((group) => group.classLabel === selectedClass);
  }, [classGroups, selectedClass]);

  const pieEntries = useMemo<PieChartEntry[]>(() => {
    if (!selectedClassGroup) return [];

    return selectedClassGroup.entries.map((entry) => ({
      formId: entry.formId,
      formTitle: entry.formTitle,
      finalScore: entry.finalScore,
    }));
  }, [selectedClassGroup]);

  const pieChartData = useMemo(
    () => ({
      labels: pieEntries.map((item) => item.formTitle),
      datasets: [
        {
          data: pieEntries.map((item) => Number(item.finalScore.toFixed(2))),
          backgroundColor: ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#9333EA', '#0891B2', '#EA580C', '#4F46E5'],
          borderColor: '#ffffff',
          borderWidth: 2,
          offset: pieEntries.map((entry) => (entry.formId === selectedFormId ? 25 : 0)),
        },
      ],
    }),
    [pieEntries, selectedFormId]
  );

  const pieChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          position: 'bottom' as const,

          labels: {
            usePointStyle: true,
            padding: 18,
          },
        },

        tooltip: {
          callbacks: {
            label: (context: any) => {
              const entry = pieEntries[context.dataIndex];

              if (!entry) return '';

              return [`${entry.formTitle}`, `Nilai: ${normalizationScoreToPercentage(entry.finalScore)}`, '', 'Klik untuk melihat detail penilaian'];
            },
          },
        },
      },
    }),
    [pieEntries]
  );

  const handleSelectForm = (index: number) => {
    const selected = pieEntries[index];

    if (!selected) return;

    setSelectedFormId(selected.formId);
  };

  const handlePieChartClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!pieChartRef.current) return;

    const element = getElementAtEvent(pieChartRef.current, event);

    if (!element.length) return;

    handleSelectForm(element[0].index);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">Pilih Kelas</label>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-1"
        >
          {classGroups.map((group) => (
            <option key={group.classLabel} value={group.classLabel}>
              {getClassLabel({
                classLabel: group.classLabel,
              } as HistoryEntry)}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 text-center">
        <div className="w-full justify-items-center rounded-xl bg-white">
          <div className="w-full max-w-[900px] rounded-xl bg-white p-4 shadow-sm">
            <div className="h-96">
              <Pie ref={pieChartRef} data={pieChartData} options={pieChartOptions} onClick={handlePieChartClick} />
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-4 mt-2">
                <p className="text-sm font-semibold text-slate-800">Daftar Form</p>
                <p className="mt-1 text-sm text-slate-500">Pilih salah satu formulir untuk melihat detailnya.</p>
              </div>

              <div className="flex flex-row flex-wrap justify-center gap-3">
                {pieEntries.map((entry) => {
                  const active = entry.formId === selectedFormId;

                  return (
                    <button
                      key={entry.formId}
                      type="button"
                      onClick={() => setSelectedFormId(entry.formId)}
                      className={twMerge(
                        'w-full rounded-xl border p-4 text-left transition-all',
                        active ? 'bg-primary-50 ring-primary-100 border-primary-1 ring-2' : 'hover:border-primary-200 border-slate-200'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{entry.formTitle}</p>

                          <p className="mt-1 text-xs text-slate-500">{entry.formId}</p>
                        </div>

                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{normalizationScoreToPercentage(entry.finalScore)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeAssessmentResult;
