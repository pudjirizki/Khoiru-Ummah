import React, { useEffect, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
import { CurrentUserInterface, UserInterface } from '/src/interfaces/user';
// utils
import { fTitleCase } from '/src/utils/format-string';
// components
import { SelectField } from '/src/components/form';

// ----------------------------------------------------------------------
interface OptionSelectInterface {
  label: string;
  value: string;
}

interface GroupedOptionSelectInterface {
  label: string;
  options: OptionSelectInterface[];
}

interface StudentProfileProps {
  selectedStudent: StudentInterface | null;
  users: UserInterface[];
  students: StudentInterface[];
  currentUser: CurrentUserInterface | null;
  setSelectedStudent: React.Dispatch<React.SetStateAction<StudentInterface | null>>;
  className?: string;
}

// ----------------------------------------------------------------------

const StudentProfile: React.FC<StudentProfileProps> = ({ currentUser, users, selectedStudent, students, className, setSelectedStudent }) => {
  const [parent, setParent] = useState<UserInterface | null>(null);

  const dbUser = currentUser?.databaseUsers;

  const parentChildren = useMemo(() => {
    if (dbUser?.role !== 'parent') return [];

    return [...(students ?? [])]
      .filter((student) => student.parentId === dbUser.id)
      .sort((a, b) => a.class.localeCompare(b.class, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [dbUser?.id, dbUser?.role, students]);

  const studentOptions = useMemo<GroupedOptionSelectInterface[]>(() => {
    if (dbUser?.role !== 'parent' || parentChildren.length === 0) return [];

    const groupedStudents = parentChildren.reduce<Record<string, GroupedOptionSelectInterface>>((acc, student) => {
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

    return Object.values(groupedStudents);
  }, [dbUser?.role, parentChildren]);

  const selectedChildOption = useMemo(() => studentOptions.flatMap((group) => group.options).find((option) => option.value === selectedStudent?.id), [selectedStudent?.id, studentOptions]);

  // DEFAULT VALUE SELECTED STUDENT (PARENT ROLE)
  useEffect(() => {
    if (dbUser?.role !== 'parent') return;

    if (parentChildren.length === 0) {
      setSelectedStudent(null);
      return;
    }

    const currentSelectedIsOwned = parentChildren.some((student) => student.id === selectedStudent?.id);
    if (currentSelectedIsOwned) return;

    setSelectedStudent(parentChildren[0]);
  }, [dbUser?.role, parentChildren, selectedStudent?.id, setSelectedStudent]);

  // PARENT
  useEffect(() => {
    const result = users.find((u) => u.id === selectedStudent?.parentId);
    result ? setParent(result) : setParent(null);
  }, [selectedStudent?.parentId, users]);

  const handleSelectChild = (option: OptionSelectInterface | null) => {
    if (!option) return;

    const nextStudent = parentChildren.find((student) => student.id === option.value) ?? null;
    setSelectedStudent(nextStudent);
  };

  return (
    <div className={twMerge(`w-full rounded-xl border border-gray-100 bg-white p-4 font-poppins shadow-sm`, className)}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-1 text-lg font-bold text-white">{selectedStudent?.name?.charAt(0)?.toUpperCase() || '-'}</div>

        <div>
          <p className="text-lg font-semibold text-primary-1">Profil Siswa</p>

          <p className="text-xs text-gray-500">Data siswa terpilih</p>
        </div>
      </div>

      {dbUser?.role === 'parent' && parentChildren.length > 1 && (
        <div className="mb-4">
          <SelectField
            label="Pilih Anak"
            placeholder="Pilih anak"
            options={studentOptions}
            value={selectedChildOption}
            onChange={(option) => handleSelectChild(option)}
            formatGroupLabel={(group) => <span className="font-medium">{group.label}</span>}
            components={{ IndicatorSeparator: () => null }}
            containerClassname="w-full"
          />
        </div>
      )}

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

export default StudentProfile;
