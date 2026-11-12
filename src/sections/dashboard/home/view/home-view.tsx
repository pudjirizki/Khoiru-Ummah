import React, { useEffect, useState } from 'react';
// hooks
import { useFinalForm } from '/src/hooks/use-final-form';
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
import { useFinalAssessment } from '/src/hooks/use-final-assessment';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
//
import HomeDashboardAdmin from '../home-dashboard-admin';
import HomeDashboardParent from '../home-dashboard-parent';
import HomeDashboardTeacher from '../home-dashboard-teacher';
import HomeAssessmentResult from '../home-assessment-result';

// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

const HomeView: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<StudentInterface | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  const { currentUser, allUsersCache } = useDatabaseUser();

  const { allFinalFormsCache, fetchFinalFormById } = useFinalForm();

  const { allFinalAssessmentsCache, fetchFinalAssessmentById } = useFinalAssessment();

  const { students, allStudentsCache } = useDatabaseStudent();

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const hour = currentTime.getHours();
  const greeting = hour < 11 ? 'Selamat Pagi ☀️' : hour < 15 ? 'Selamat Siang 🌤️' : hour < 18 ? 'Selamat Sore 🌥️' : 'Selamat Malam 🌙';

  // CURRENT TIME
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // FETCH
  useEffect(() => {
    students({ perPage: 50 });
  }, [students]);

  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-1 via-primary-3 to-primary-2 px-8 py-10 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 md:flex-row md:justify-between">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur-sm">
              Dashboard{' '}
              {(currentUser?.databaseUsers?.role === 'parent' && 'Wali Siswa') ||
                (currentUser?.databaseUsers?.role === 'teacher' && 'Guru') ||
                (currentUser?.databaseUsers?.role === 'admin' && 'Admin')}
            </span>

            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <p className="text-center text-xs text-white/80">{formattedDate}</p>

              <p className="text-center font-mono text-lg font-semibold">{formattedTime}</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-2">
            <h1 className="text-center font-poppins text-3xl font-bold md:text-4xl">{greeting}</h1>

            <h2 className="text-center font-poppins text-2xl font-semibold tracking-wide md:text-3xl">{currentUser?.databaseUsers?.name?.toUpperCase()}</h2>

            <p className="max-w-2xl text-center font-inter text-sm text-white/80 md:text-base">Semoga harimu produktif. Pantau data, aktivitas, dan perkembangan terbaru melalui dashboard ini.</p>
          </div>
        </div>
      </div>

      {currentUser?.databaseUsers?.role === 'admin' && (
        <HomeDashboardAdmin
          currentUser={currentUser}
          users={allUsersCache}
          allStudentsCache={allStudentsCache}
          allUsersCache={allUsersCache}
          forms={allFinalFormsCache}
          assessments={allFinalAssessmentsCache}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
        />
      )}

      {currentUser?.databaseUsers?.role === 'teacher' && (
        <HomeDashboardTeacher users={allUsersCache} allStudentsCache={allStudentsCache} forms={allFinalFormsCache} assessments={allFinalAssessmentsCache} selectedStudent={selectedStudent} />
      )}

      {currentUser?.databaseUsers?.role === 'parent' && (
        <HomeDashboardParent
          currentUser={currentUser}
          users={allUsersCache}
          students={allStudentsCache}
          forms={allFinalFormsCache}
          assessments={allFinalAssessmentsCache}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
        />
      )}

      <HomeAssessmentResult
        currentUser={currentUser}
        users={allUsersCache}
        forms={allFinalFormsCache}
        assessments={allFinalAssessmentsCache}
        selectedStudent={selectedStudent}
        fetchFinalAssessmentById={fetchFinalAssessmentById}
        fetchFinalFormById={fetchFinalFormById}
      />
    </section>
  );
};

export default HomeView;
