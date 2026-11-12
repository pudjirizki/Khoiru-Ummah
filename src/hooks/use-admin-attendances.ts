import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, serverTimestamp, updateDoc, where, doc } from 'firebase/firestore';
// firebase
import { fbFirestore } from '/src/firebase';
// interfaces
import { TeacherAttendanceInterface, TeacherAttendanceStatus } from '/src/interfaces/attendance';

interface UseAdminAttendancesInterface {
  attendances: TeacherAttendanceInterface[];
  isLoading: boolean;
  error: string;
  updateAttendance: (attendanceId: string, status: TeacherAttendanceStatus, note: string) => Promise<void>;
  verifyAttendance: (attendanceId: string, adminId: string, adminName: string) => Promise<void>;
}

export const useAdminAttendances = (date: string): UseAdminAttendancesInterface => {
  const [attendances, setAttendances] = useState<TeacherAttendanceInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');

    const attendanceQuery = query(collection(fbFirestore, 'teacherAttendances'), where('date', '==', date));
    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        setAttendances(
          snapshot.docs
            .map((attendanceDoc) => attendanceDoc.data() as TeacherAttendanceInterface)
            .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'id'))
        );
        setIsLoading(false);
      },
      (snapshotError) => {
        console.error('Failed to load teacher attendances for admin', snapshotError);
        setError('Data absensi tidak dapat dimuat. Periksa koneksi atau hak akses Firestore.');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [date]);

  const updateAttendance = async (attendanceId: string, status: TeacherAttendanceStatus, note: string) => {
    if (status === 'absent' && !note.trim()) throw new Error('Catatan wajib diisi jika tidak hadir.');

    await updateDoc(doc(fbFirestore, 'teacherAttendances', attendanceId), {
      status,
      note: status === 'absent' ? note.trim() : '',
      isVerified: false,
      verifiedBy: null,
      verifiedByName: null,
      verifiedAt: null,
      updatedAt: serverTimestamp(),
    });
  };

  const verifyAttendance = async (attendanceId: string, adminId: string, adminName: string) => {
    await updateDoc(doc(fbFirestore, 'teacherAttendances', attendanceId), {
      isVerified: true,
      verifiedBy: adminId,
      verifiedByName: adminName,
      verifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  return { attendances, isLoading, error, updateAttendance, verifyAttendance };
};
