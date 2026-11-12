import React, { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
import { CurrentUserInterface, UserInterface } from '/src/interfaces/user';
// utils
import { fTitleCase } from '/src/utils/format-string';

// ----------------------------------------------------------------------
interface OptionSelectInterface {
  label: string;
  value: string;
}

interface GroupedOptionSelectInterface {
  label: string;
  options: OptionSelectInterface[];
}

interface DetailStudentProfileProps {
  selectedStudent: StudentInterface | null;
  users: UserInterface[];
  students: StudentInterface[];
  currentUser: CurrentUserInterface | null;
  setSelectedStudent: React.Dispatch<React.SetStateAction<StudentInterface | null>>;
  className?: string;
}

// ----------------------------------------------------------------------

const DetailStudentProfile: React.FC<DetailStudentProfileProps> = ({ currentUser, users, selectedStudent, students, className, setSelectedStudent }) => {
  const [studentOptions, setStudentOptions] = useState<GroupedOptionSelectInterface[]>([]);

  const [parent, setParent] = useState<UserInterface | null>(null);

  // STUDENT OPTIONS
  useEffect(() => {
    const sortedStudents = [...(students ?? [])].sort((a, b) => {
      const paramA = a.class.toString().toUpperCase();
      const paramB = b.class.toString().toUpperCase();
      if (paramA < paramB) {
        return -1;
      }
      if (paramA > paramB) {
        return 1;
      }

      return 0;
    });

    const groupedStudents: GroupedOptionSelectInterface[] = sortedStudents.reduce((acc: any, student) => {
      const classKey = `Kelas ${student.class}`;

      if (!acc[classKey]) {
        acc[classKey] = {
          label: classKey,
          options: [],
        };
      }

      acc[classKey].options.push({
        label: fTitleCase(student.name),
        value: student.id,
      });

      return acc;
    }, {});

    const result = Object.values(groupedStudents);
    setStudentOptions(result);
  }, [students]);

  // DEFAULT VALUE SELECTED STUDENT (PARENT ROLE)
  useEffect(() => {
    const dbUser = currentUser?.databaseUsers;
    if (dbUser?.role !== 'parent') return;

    const student = [...(students ?? [])]
      .filter((s) => s.parentId === dbUser.id)
      .sort((a, b) => a.class.localeCompare(b.class, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))[0];
    if (!student) return;

    const selectedOption = studentOptions?.flatMap((group) => group.options).find((opt) => opt.value === student.id);
    if (!selectedOption) return;

    const filteredStudents = students?.find((s) => s.id === selectedOption.value);
    filteredStudents ? setSelectedStudent(filteredStudents) : setSelectedStudent(null);
  }, [currentUser?.databaseUsers, setSelectedStudent, studentOptions, students]);

  // PARENT
  useEffect(() => {
    const result = users.find((u) => u.id === selectedStudent?.parentId);
    result ? setParent(result) : setParent(null);
  }, [selectedStudent?.parentId, users]);

  return (
    <div className={twMerge(`w-full rounded-xl border border-gray-100 bg-white p-4 font-poppins shadow-sm`, className)}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-1 text-lg font-bold text-white">{selectedStudent?.name?.charAt(0)?.toUpperCase() || '-'}</div>

        <div>
          <p className="text-lg font-semibold text-primary-1">Profil Siswa</p>

          <p className="text-xs text-gray-500">Data siswa terpilih</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-gradient-to-r from-primary-1 to-primary-2 p-3 text-white">
        <p className="text-xs opacity-90">Nama Siswa</p>

        <p className="mt-1 text-base font-semibold">{selectedStudent?.name || '-'}</p>

        <span className="mt-2 inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium">Kelas {selectedStudent?.class || '-'}</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <InfoItem label="Nomor Induk Siswa" value={selectedStudent?.identityNumber} />

        <InfoItem label="Kelas" value={selectedStudent?.class} />

        <InfoItem label="Wali Siswa" value={parent?.name} />
      </div>
    </div>
  );
};

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase text-gray-500">{label}</p>

      <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">{value || '-'}</p>
    </div>
  );
}

export default DetailStudentProfile;
