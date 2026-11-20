import { useCallback, useEffect, useState } from 'react';
import { supabase } from '/src/lib/supabase';
// firebase fallback
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

const mapAttendance = (d: any): TeacherAttendanceInterface => ({
  id: d.id,
  teacherId: d.teacher_id ?? d.teacherId,
  teacherName: d.teacher_name ?? d.teacherName,
  date: d.date,
  status: d.status,
  note: d.note ?? '',
  isVerified: Boolean(d.is_verified ?? d.isVerified),
  verifiedBy: d.verified_by ?? d.verifiedBy ?? null,
  verifiedByName: d.verified_by_name ?? d.verifiedByName ?? null,
  verifiedAt: d.verified_at ?? d.verifiedAt ?? null,
});

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

        // 1. Try Supabase snake_case
        let { data, error: err } = await supabase
          .from('teacher_attendances')
          .select('*')
          .eq('id', attendanceId)
          .maybeSingle();

        // 2. Try Supabase camelCase
        if (err) {
          const { data: fallbackData, error: fallbackErr } = await supabase
            .from('teacherAttendances')
            .select('*')
            .eq('id', attendanceId)
            .maybeSingle();

          if (!fallbackErr && fallbackData) {
            data = fallbackData;
            err = null;
          }
        }

        // 3. Fallback to Firestore if table doesn't exist in Supabase
        if (err) {
          try {
            const snap = await getDoc(doc(fbFirestore, 'teacherAttendances', attendanceId));
            if (isCurrent) {
              setAttendance(snap.exists() ? mapAttendance({ id: snap.id, ...(snap.data() as any) }) : null);
            }
            return;
          } catch (fsErr) {
            console.warn('Firestore fallback error:', fsErr);
            throw err;
          }
        }

        if (isCurrent) {
          setAttendance(data ? mapAttendance(data) : null);
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
        const now = new Date().toISOString();
        const row = {
          id,
          teacher_id: teacherId,
          teacher_name: teacher.name,
          date,
          status,
          note: status === 'absent' ? note.trim() : '',
          is_verified: false,
          verified_by: null,
          verified_by_name: null,
          verified_at: null,
          updated_at: now,
        };

        let { error: insertErr } = await supabase.from('teacher_attendances').upsert(row);
        if (insertErr) {
          const { error: insertErr2 } = await supabase.from('teacherAttendances').upsert({
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
            updatedAt: now,
          });

          if (insertErr2) {
            // Fallback save to Firestore
            await setDoc(doc(fbFirestore, 'teacherAttendances', id), {
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
              updatedAt: now,
            }, { merge: true });
          }
        }

        setAttendance({
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
        });
      } finally {
        setIsSaving(false);
      }
    },
    [date, teacher, teacherId]
  );

  return { attendance, isLoading, isSaving, error, saveAttendance };
};
