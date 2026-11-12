import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
// firebase
import { fbFirestore } from '/src/firebase';
// interfaces
import { TeacherAttendanceInterface, TeacherAttendanceStatus } from '/src/interfaces/attendance';
import { UserInterface } from '/src/interfaces/user';

interface UseDatabaseAttendanceInterface {
  attendance: TeacherAttendanceInterface | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  saveAttendance: (status: TeacherAttendanceStatus, note: string) => Promise<void>;
}

const getAttendanceId = (teacherId: string, date: string) => `${teacherId}_${date}`;

export const useDatabaseAttendance = (teacher: UserInterface | null, date: string): UseDatabaseAttendanceInterface => {
  const [attendance, setAttendance] = useState<TeacherAttendanceInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const teacherId = teacher?.id;

  useEffect(() => {
    let isCurrent = true;

    const loadAttendance = async () => {
      if (!teacherId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const attendanceId = getAttendanceId(teacherId, date);
        const snapshot = await getDoc(doc(fbFirestore, 'teacherAttendances', attendanceId));

        if (isCurrent) {
          setAttendance(snapshot.exists() ? (snapshot.data() as TeacherAttendanceInterface) : null);
        }
      } catch (loadError) {
        console.error('Failed to load teacher attendance', loadError);
        if (isCurrent) setError('Absensi belum dapat dimuat. Silakan muat ulang halaman.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadAttendance();

    return () => {
      isCurrent = false;
    };
  }, [date, teacherId]);

  const saveAttendance = useCallback(
    async (status: TeacherAttendanceStatus, note: string) => {
      if (!teacherId || !teacher) throw new Error('Data guru tidak ditemukan.');
      if (status === 'absent' && !note.trim()) throw new Error('Catatan wajib diisi jika tidak hadir.');

      setIsSaving(true);
      try {
        const id = getAttendanceId(teacherId, date);
        const attendanceData = {
          id,
          teacherId,
          teacherName: teacher.name,
          date,
          status,
          note: status === 'absent' ? note.trim() : '',
          isVerified: false,
          verifiedBy: null,
          verifiedByName: null,
          verifiedAt: null,
          updatedAt: serverTimestamp(),
        };

        await setDoc(
          doc(fbFirestore, 'teacherAttendances', id),
          {
            ...attendanceData,
            ...(!attendance ? { createdAt: serverTimestamp() } : {}),
          },
          { merge: true }
        );

        setAttendance({
          ...attendanceData,
          note: status === 'absent' ? note.trim() : '',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [attendance, date, teacher, teacherId]
  );

  return { attendance, isLoading, isSaving, error, saveAttendance };
};
