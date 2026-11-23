import { useCallback, useEffect, useState } from 'react';
// supabase
import { supabase } from '/src/supabase';
import { useDatabaseNotification } from '/src/hooks/use-database-notification';
// interfaces
import { TeacherAttendanceInterface, TeacherAttendanceStatus } from '/src/interfaces/attendance';
import { UserInterface } from '/src/interfaces/user';
import { toError } from '/src/utils/to-error';

interface UseDatabaseAttendanceInterface {
  attendance: TeacherAttendanceInterface | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  saveAttendance: (status: TeacherAttendanceStatus, note: string) => Promise<void>;
}

const getAttendanceId = (teacherId: string, date: string) => `${teacherId}_${date}`;

const mapAttendance = (data: any): TeacherAttendanceInterface => ({
  id: data.id,
  teacherId: data.teacher_id ?? data.teacherId,
  teacherName: data.teacher_name ?? data.teacherName,
  date: data.date,
  status: data.status === 'Hadir' || data.status === 'present' ? 'present' : 'absent',
  note: data.note ?? '',
  isVerified: data.is_verified ?? data.isVerified ?? false,
  verifiedBy: data.verified_by ?? data.verifiedBy ?? null,
  verifiedByName: data.verified_by_name ?? data.verifiedByName ?? null,
  verifiedAt: data.verified_at ? new Date(data.verified_at) : (data.verifiedAt ?? null),
});

export const useDatabaseAttendance = (teacher: UserInterface | null, date: string): UseDatabaseAttendanceInterface => {
  const [attendance, setAttendance] = useState<TeacherAttendanceInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const teacherId = teacher?.id;
  const { createNotification } = useDatabaseNotification();

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
        const { data, error: loadErr } = await supabase
          .from('teacher_attendance')
          .select('*')
          .eq('id', attendanceId)
          .maybeSingle();

        if (loadErr) throw loadErr;

        if (isCurrent) {
          setAttendance(data ? mapAttendance(data) : null);
        }
      } catch (loadError) {
        console.error('Failed to load teacher attendance', loadError);
        if (isCurrent) setError(`Absensi belum dapat dimuat: ${toError(loadError).message}`);
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
        const updatedAt = new Date().toISOString();
        const payload = {
          id,
          teacher_id: teacherId,
          teacher_name: teacher.name,
          date,
          status: status === 'present' ? 'Hadir' : 'Tidak hadir',
          note: status === 'absent' ? note.trim() : '',
          checked_in_at: status === 'present' ? updatedAt : null,
          updated_at: updatedAt,
          updated_by: teacherId,
          updated_by_name: teacher.name,
          is_verified: false,
          verified_by: null,
          verified_by_name: null,
          verified_at: null,
        };

        const { error: upsertErr } = await supabase.from('teacher_attendance').upsert(payload, { onConflict: 'id' });

        if (upsertErr) throw upsertErr;

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

        try {
          await createNotification({
            userId: '',
            formId: null,
            name: teacher.name,
            description: `mengirim absensi ${status === 'present' ? 'Hadir' : 'Tidak hadir'} untuk ${date}.`,
            targetRole: 'admin',
            isRead: false,
          });
        } catch (notificationError) {
          console.error('Attendance saved, but admin notification failed', notificationError);
          throw new Error(`Absensi tersimpan, tetapi notifikasi admin gagal dibuat: ${toError(notificationError).message}`);
        }
      } catch (saveError) {
        throw toError(saveError);
      } finally {
        setIsSaving(false);
      }
    },
    [createNotification, date, teacher, teacherId]
  );

  return { attendance, isLoading, isSaving, error, saveAttendance };
};
