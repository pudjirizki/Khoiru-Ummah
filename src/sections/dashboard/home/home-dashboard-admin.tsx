import React from 'react';
// hooks
import { UseFinalFormInterface } from '/src/hooks/use-final-form';
import { UseFinalAssessmentInterface } from '/src/hooks/use-final-assessment';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
import { CurrentUserInterface, UserInterface } from '/src/interfaces/user';
// _common
import { Summary, TotalStudent, TotalUser } from './_common';

// ----------------------------------------------------------------------

interface HomeDashboardAdminProps {
  currentUser: CurrentUserInterface | null;
  users: UserInterface[];
  allStudentsCache: StudentInterface[];
  allUsersCache: UserInterface[];
  forms: UseFinalFormInterface['allFinalFormsCache'];
  assessments: UseFinalAssessmentInterface['allFinalAssessmentsCache'];
  selectedStudent: StudentInterface | null;
  setSelectedStudent: React.Dispatch<React.SetStateAction<StudentInterface | null>>;
}

// ----------------------------------------------------------------------

const HomeDashboardAdmin: React.FC<HomeDashboardAdminProps> = ({ allStudentsCache, allUsersCache, assessments, forms }) => {
  return (
    <div className="mt-10">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <Summary title="Jumlah Siswa" total={allStudentsCache?.length} icon="mdi:users" />
        <Summary title="Jumlah Formulir" total={forms?.length} icon="mdi:form" />
        <Summary title="Penilaian Formulir" total={assessments?.length} icon="material-symbols:feed" />
      </div>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row">
        <TotalStudent students={allStudentsCache} />

        <TotalUser users={allUsersCache} className="h-fit" />
      </div>
    </div>
  );
};

export default HomeDashboardAdmin;
