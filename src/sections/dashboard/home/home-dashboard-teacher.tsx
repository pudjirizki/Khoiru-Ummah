import React from 'react';
// hooks
import { UseFinalFormInterface } from '/src/hooks/use-final-form';
import { UseFinalAssessmentInterface } from '/src/hooks/use-final-assessment';
// interfaces
import { UserInterface } from '/src/interfaces/user';
import { StudentInterface } from '/src/interfaces/student';
// _common
import { PendingAssessment, TotalForm, TotalStudent } from './_common';

// ----------------------------------------------------------------------

interface HomeDashboardTeacherProps {
  users: UserInterface[];
  allStudentsCache: StudentInterface[];
  forms: UseFinalFormInterface['allFinalFormsCache'];
  assessments: UseFinalAssessmentInterface['allFinalAssessmentsCache'];
  selectedStudent: StudentInterface | null;
}

// ----------------------------------------------------------------------

const HomeDashboardTeacher: React.FC<HomeDashboardTeacherProps> = ({ users, allStudentsCache, assessments, forms, selectedStudent }) => {
  return (
    <div className="mt-10">
      <div className="flex flex-col gap-10 lg:flex-row">
        <TotalStudent students={allStudentsCache} />

        <div className="flex w-full flex-col gap-10">
          <TotalForm selectedStudent={selectedStudent} forms={forms} className="h-[35%] justify-center gap-10" />

          <PendingAssessment students={allStudentsCache} selectedStudent={selectedStudent} assessments={assessments} forms={forms} users={users} className="h-[35%] justify-center gap-10" />
        </div>
      </div>
    </div>
  );
};

export default HomeDashboardTeacher;
