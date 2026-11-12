import React, { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { UseFinalFormInterface } from '/src/hooks/use-final-form';
import { UseFinalAssessmentInterface } from '/src/hooks/use-final-assessment';
// interfaces
import { UserInterface } from '/src/interfaces/user';
import { StudentInterface } from '/src/interfaces/student';
// components
import { Button } from '/src/components/button';
import { DialogGeneral } from '/src/components/dialog';

// ----------------------------------------------------------------------

interface PendingAssessmentProps {
  students: StudentInterface[];
  selectedStudent: StudentInterface | null;
  forms: UseFinalFormInterface['allFinalFormsCache'];
  assessments: UseFinalAssessmentInterface['allFinalAssessmentsCache'];
  users: UserInterface[];
  className?: string;
}

// ----------------------------------------------------------------------

const PendingAssessment: React.FC<PendingAssessmentProps> = ({ students, selectedStudent, assessments, forms, users, className }) => {
  const parent = useMemo(() => {
    const id = selectedStudent?.parentId;
    return id ? users.find((u) => u.id === id) : undefined;
  }, [users, selectedStudent?.parentId]);

  const assessmentsByStudent = useMemo(() => {
    const map = new Map<string, typeof assessments>();

    for (const a of assessments) {
      if (!map.has(a.studenId)) {
        map.set(a.studenId, []);
      }

      map.get(a.studenId)!.push(a);
    }

    return map;
  }, [assessments]);

  const formsByClass = useMemo(() => {
    const map = new Map<string, typeof forms>();

    for (const f of forms) {
      for (const cls of f.class) {
        if (!map.has(cls)) {
          map.set(cls, []);
        }

        map.get(cls)!.push(f);
      }
    }

    return map;
  }, [forms]);

  const pendingCountsByStudent = useMemo(() => {
    const result = new Map<string, number>();

    for (const student of students) {
      const studentAssessments = assessmentsByStudent.get(student.id) ?? [];

      const relevantAssessments = parent?.id ? studentAssessments.filter((a) => a.userId === parent.id) : studentAssessments;

      const assessedFormIds = new Set(relevantAssessments.map((a) => a.formId));

      const classForms = formsByClass.get(student.class) ?? [];

      const pendingCount = classForms.filter((f) => !assessedFormIds.has(f.id)).length;

      result.set(student.id, pendingCount);
    }

    return result;
  }, [students, assessmentsByStudent, formsByClass, parent?.id]);

  const totalPending = useMemo(() => {
    let sum = 0;

    for (const value of pendingCountsByStudent.values()) {
      sum += value;
    }

    return sum;
  }, [pendingCountsByStudent]);

  const displayCount = selectedStudent?.id ? (pendingCountsByStudent.get(selectedStudent.id) ?? 0) : totalPending;

  return (
    <div className={twMerge(`relative overflow-hidden rounded-2xl border border-primary-2/20 bg-gradient-to-br from-primary-1 to-primary-3 p-5 shadow-lg`, className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Icon icon="mdi:clock-alert-outline" className="absolute -right-8 -top-8 size-32 text-white/10" />

        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      </div>

      <RenderDialog selectedStudentName={selectedStudent?.name} />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon icon="mdi:clock-alert-outline" className="size-6 text-white" />
          </div>

          <div>
            <p className="font-poppins text-xs uppercase tracking-wider text-white/70">Status</p>

            <h3 className="font-poppins text-base font-semibold text-white">Menunggu Penilaian</h3>
          </div>
        </div>

        <div>
          <p className="font-poppins text-4xl font-bold leading-none text-white md:text-5xl">{displayCount}</p>

          <p className="mt-2 font-inter text-sm text-white/80">Formulir belum diisi</p>
        </div>
      </div>
    </div>
  );
};

function RenderDialog({ selectedStudentName }: { selectedStudentName?: string }) {
  const isShowDialog = useBoolean(false);

  return (
    <>
      <Button onClick={isShowDialog.onTrue} variant="gost" className="absolute right-3 top-3 z-20 min-h-0 p-1">
        <Icon icon="material-symbols:info-outline-rounded" className="size-5 text-white/80" />
      </Button>

      <DialogGeneral state={isShowDialog} centered className="flex flex-col gap-2">
        <p className="font-poppins text-xl font-semibold">Menunggu Penilaian</p>

        <p className="font-inter text-[#515151]">
          Menampilkan jumlah formulir yang belum diisi oleh <span className="font-semibold text-primary-1">{selectedStudentName ?? 'seluruh siswa'}</span>.
        </p>
      </DialogGeneral>
    </>
  );
}

export default PendingAssessment;
