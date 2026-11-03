import { useCallback, useEffect, useState } from 'react';
import { collection, doc, DocumentData, onSnapshot, query, QuerySnapshot, runTransaction, serverTimestamp, Timestamp, where } from 'firebase/firestore';
// firebase
import { fbFirestore } from '/src/firebase';
// interfaces
import { TeacherAttendanceInterface, TeacherAttendanceStatusType } from '/src/interfaces/attendance';
import { UserInterface } from '/src/interfaces/user';

const mapAttendance = (id: string, data: DocumentData): TeacherAttendanceInterface => ({
  id,
  teacherId: String(data.teacherId ?? ''),
  teacherName: String(data.teacherName ?? ''),
  date: String(data.date ?? ''),
  status: data.status === 'Hadir' ? 'Hadir' : 'Tidak hadir',
  note: String(data.note ?? ''),
  checkedInAt: data.checkedInAt instanceof Timestamp ? data.checkedInAt.toDate() : data.checkedInAt instanceof Date ? data.checkedInAt : null,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
  updatedByName: String(data.updatedByName ?? ''),
});

interface UseDatabaseAttendanceInterface {
  attendanceList: TeacherAttendanceInterface[];
  isLoading: boolean;
  error: string;
  saveAttendance: (teacher: UserInterface, status: TeacherAttendanceStatusType, note: string) => Promise<void>;
}

export const useDatabaseAttendance = (date: string, user: UserInterface | null, isAdmin: boolean): UseDatabaseAttendanceInterface => {
  const [attendanceList, setAttendanceList] = useState<TeacherAttendanceInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!date || (!isAdmin && !user)) {
      setAttendanceList([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError('');

    const handleSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
      setAttendanceList(snapshot.docs.map((attendanceDoc) => mapAttendance(attendanceDoc.id, attendanceDoc.data())));
      setIsLoading(false);
    };

    const handleError = (snapshotError: Error) => {
      console.error('teacher attendance snapshot error', snapshotError);
      setError('Data absensi gagal dimuat. Silakan coba lagi.');
      setIsLoading(false);
    };

    if (isAdmin) {
      const attendanceQuery = query(collection(fbFirestore, 'teacherAttendance'), where('date', '==', date));
      return onSnapshot(attendanceQuery, handleSnapshot, handleError);
    }

    const attendanceRef = doc(fbFirestore, 'teacherAttendance', `${date}_${user?.id}`);
    return onSnapshot(
      attendanceRef,
      (snapshot) => {
        setAttendanceList(snapshot.exists() ? [mapAttendance(snapshot.id, snapshot.data())] : []);
        setIsLoading(false);
      },
      handleError
    );
  }, [date, isAdmin, user]);

  const saveAttendance = useCallback(
    async (teacher: UserInterface, status: TeacherAttendanceStatusType, note: string) => {
      if (!user) throw new Error('Data pengguna belum tersedia.');
      if (!isAdmin && teacher.id !== user.id) throw new Error('Guru hanya dapat mencatat absensinya sendiri.');

      const attendanceId = `${date}_${teacher.id}`;
      const attendanceRef = doc(fbFirestore, 'teacherAttendance', attendanceId);

      await runTransaction(fbFirestore, async (transaction) => {
        const existingAttendance = await transaction.get(attendanceRef);
        if (existingAttendance.exists() && !isAdmin) {
          throw new Error('Absensi hari ini sudah tercatat. Hubungi admin jika perlu diperbaiki.');
        }

        const existingData = existingAttendance.data();
        const checkedInAt =
          status !== 'Hadir'
            ? null
            : existingData?.status === 'Hadir' && existingData.checkedInAt
              ? existingData.checkedInAt
              : serverTimestamp();

        transaction.set(
          attendanceRef,
          {
            teacherId: teacher.id,
            teacherName: teacher.name,
            date,
            status,
            note: note.trim(),
            checkedInAt,
            updatedAt: serverTimestamp(),
            updatedBy: user.id,
            updatedByName: user.name,
          },
          { merge: true }
        );
      });
    },
    [date, isAdmin, user]
  );

  return { attendanceList, isLoading, error, saveAttendance };
};
