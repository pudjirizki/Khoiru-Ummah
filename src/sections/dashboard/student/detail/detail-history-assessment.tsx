import React, { useEffect, useMemo, useState } from 'react';
import 'chart.js/auto';
import { twMerge } from 'tailwind-merge';
// interfaces
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
import { FinalFormInterface } from '/src/interfaces/final-form';
import { StudentInterface } from '/src/interfaces/student';
import { UserInterface } from '/src/interfaces/user';
// lib
import { calculateFinalScore } from '/src/lib/calculations/scoring';
import { buildCriteriaHistory, CriteriaHistoryEntry } from '/src/lib/calculations/criteria-history';
import CriteriaHistoryChart from '/src/sections/dashboard/_common/criteria-history-chart';
import CriteriaHistoryDetailChart from '/src/sections/dashboard/_common/criteria-history-detail-chart';
// ----------------------------------------------------------------------

interface DetailHistoryAssessmentProps {
  student: StudentInterface | null;
  forms: FinalFormInterface[];
  assessments: FinalAssessmentInterface[];
  users: UserInterface[];
  selectedFormId: string;
  setSelectedFormId: React.Dispatch<React.SetStateAction<string>>;
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
  criteriaScores: CriteriaHistoryEntry[];
}

interface HistoryClassGroup {
  classLabel: string;
  totalScore: number;
  averageScore: number;
  entries: HistoryEntry[];
}

// ----------------------------------------------------------------------

const classCollator = new Intl.Collator('id', {
  numeric: true,
  sensitivity: 'base',
});

// ----------------------------------------------------------------------

const DetailHistoryAssessment: React.FC<DetailHistoryAssessmentProps> = ({ student, forms, assessments, users, selectedFormId, setSelectedFormId, className }) => {
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
          criteriaScores: buildCriteriaHistory(form, teacherAssessment, parentAssessment),
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
    if (!selectedClass && classGroups.length) {
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
          <p className="text-sm text-slate-500">Perbandingan nilai untuk setiap kriteria dan pertanyaan di dalam form.</p>
        </div>

        <div className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          {historyEntries.length} Form | {classGroups.length} Kelas
        </div>
      </div>

      <div className="mb-5 flex justify-center">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {renderTabButton('average', 'Rata-rata per kriteria')}
          {renderTabButton('detail', 'Rincian per form')}
        </div>
      </div>

      {activeTab === 'average' && <RenderAverageTab criteriaEntries={historyEntries.flatMap((entry) => entry.criteriaScores)} />}

      {activeTab === 'detail' && (
        <RenderDetailTab selectedClass={selectedClass} setSelectedClass={setSelectedClass} classGroups={classGroups} selectedFormId={selectedFormId} setSelectedFormId={setSelectedFormId} />
      )}
    </div>
  );
};

function RenderAverageTab({ criteriaEntries }: { criteriaEntries: CriteriaHistoryEntry[] }) {
  return <CriteriaHistoryChart criteriaEntries={criteriaEntries} />;
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
  return (
    <CriteriaHistoryDetailChart classGroups={classGroups} selectedClass={selectedClass} setSelectedClass={setSelectedClass} selectedFormId={selectedFormId} setSelectedFormId={setSelectedFormId} />
  );
}

export default DetailHistoryAssessment;
