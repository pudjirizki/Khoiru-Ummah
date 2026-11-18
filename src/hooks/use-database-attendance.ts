import { useCallback, useEffect, useState } from 'react';
// supabase
import { supabase } from '/src/supabase';
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

const mapAttendance = (data: any): TeacherAttendanceInterface => ({
  id: data.id,
  teacherId: data.teacher_id ?? data.teacherId,
  teacherName: data.teacher_name ?? data.teacherName,
  date: data.date,
  status: data.status,
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
          .from('teacher_attendances')
          .select('*')
          .eq('id', attendanceId)
          .maybeSingle();

        if (loadErr) throw loadErr;

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
        const payload = {
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
        };

        const { data, error: upsertErr } = await supabase
          .from('teacher_attendances')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

        if (upsertErr) throw upsertErr;

        setAttendance(data ? mapAttendance(data) : {
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
