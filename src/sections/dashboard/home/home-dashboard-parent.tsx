import React from 'react';
// hooks
import { UseFinalFormInterface } from '/src/hooks/use-final-form';
import { UseFinalAssessmentInterface } from '/src/hooks/use-final-assessment';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
import { CurrentUserInterface, UserInterface } from '/src/interfaces/user';
//
import { PendingAssessment, StudentProfile, TotalForm } from './_common';

// ----------------------------------------------------------------------

interface HomeDashboardParentProps {
  currentUser: CurrentUserInterface | null;
  users: UserInterface[];
  students: StudentInterface[];
  forms: UseFinalFormInterface['allFinalFormsCache'];
  assessments: UseFinalAssessmentInterface['allFinalAssessmentsCache'];
  selectedStudent: StudentInterface | null;
  setSelectedStudent: React.Dispatch<React.SetStateAction<StudentInterface | null>>;
}

// ----------------------------------------------------------------------

const HomeDashboardParent: React.FC<HomeDashboardParentProps> = ({ currentUser, users, students, assessments, forms, selectedStudent, setSelectedStudent }) => {
  return (
    <div className="mt-10 flex flex-col gap-10 lg:flex-row">
      <StudentProfile currentUser={currentUser} selectedStudent={selectedStudent} students={students} users={users} setSelectedStudent={setSelectedStudent} />

      <div className="flex w-full flex-col gap-10">
        <TotalForm selectedStudent={selectedStudent} forms={forms} className="h-full justify-center gap-10" />

        <PendingAssessment students={students} selectedStudent={selectedStudent} assessments={assessments} forms={forms} users={users} className="h-full justify-center gap-10" />
      </div>
    </div>
  );
};

export default HomeDashboardParent;
