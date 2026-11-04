import { useCallback, useEffect, useState } from 'react';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { TeacherAttendanceInterface, TeacherAttendanceStatusType } from '/src/interfaces/attendance';
import { UserInterface } from '/src/interfaces/user';

interface AttendanceRow {
  id: string;
  teacher_id: string;
  teacher_name: string;
  date: string;
  status: TeacherAttendanceStatusType;
  note: string;
  checked_in_at: string | null;
  updated_at: string | null;
  updated_by_name: string;
}

const mapAttendance = (row: AttendanceRow): TeacherAttendanceInterface => ({
  id: row.id,
  teacherId: row.teacher_id,
  teacherName: row.teacher_name,
  date: row.date,
  status: row.status,
  note: row.note ?? '',
  checkedInAt: row.checked_in_at ? new Date(row.checked_in_at) : null,
  updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  updatedByName: row.updated_by_name ?? '',
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
  const userId = user?.id ?? '';

  useEffect(() => {
    if (!date || (!isAdmin && !userId)) {
      setAttendanceList([]);
      setIsLoading(false);
      return undefined;
    }

    let isActive = true;
    setIsLoading(true);
    setError('');

    const loadAttendance = async () => {
      let request = supabase.from('teacher_attendance').select('*').eq('date', date);
      if (!isAdmin) request = request.eq('id', `${date}_${userId}`);

      const { data, error: queryError } = await request.order('teacher_name');
      if (queryError) throw queryError;
      if (isActive) {
        setAttendanceList(((data ?? []) as AttendanceRow[]).map(mapAttendance));
        setIsLoading(false);
      }
    };

    const channel = supabase
      .channel(`teacher-attendance-${date}-${isAdmin ? 'admin' : userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teacher_attendance',
          filter: isAdmin ? `date=eq.${date}` : `id=eq.${date}_${userId}`,
        },
        () => {
          loadAttendance().catch((loadError: Error) => {
            console.error('teacher attendance query error', loadError);
            if (isActive) {
              setError('Data absensi gagal dimuat. Silakan coba lagi.');
              setIsLoading(false);
            }
          });
        }
      )
      .subscribe();

    loadAttendance().catch((loadError: Error) => {
      console.error('teacher attendance query error', loadError);
      if (isActive) {
        setError('Data absensi gagal dimuat. Silakan coba lagi.');
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
    };
  }, [date, isAdmin, userId]);

  const saveAttendance = useCallback(
    async (teacher: UserInterface, status: TeacherAttendanceStatusType, note: string) => {
      if (!user) throw new Error('Data pengguna belum tersedia.');
      if (!isAdmin && teacher.id !== user.id) throw new Error('Guru hanya dapat mencatat absensinya sendiri.');

      const attendanceId = `${date}_${teacher.id}`;
      let checkedInAt: string | null = status === 'Hadir' ? new Date().toISOString() : null;

      if (isAdmin) {
        const { data: existingAttendance, error: existingError } = await supabase
          .from('teacher_attendance')
          .select('status, checked_in_at')
          .eq('id', attendanceId)
          .maybeSingle();
        if (existingError) throw existingError;
        if (status === 'Hadir' && existingAttendance?.status === 'Hadir' && existingAttendance.checked_in_at) {
          checkedInAt = existingAttendance.checked_in_at;
        }
      }

      const attendance = {
        id: attendanceId,
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        date,
        status,
        note: note.trim(),
        checked_in_at: checkedInAt,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        updated_by_name: user.name,
      };

      const { error: saveError } = isAdmin
        ? await supabase.from('teacher_attendance').upsert(attendance, { onConflict: 'id' })
        : await supabase.from('teacher_attendance').insert(attendance);

      if (saveError?.code === '23505' && !isAdmin) {
        throw new Error('Absensi hari ini sudah tercatat. Hubungi admin jika perlu diperbaiki.');
      }
      if (saveError) throw saveError;
    },
    [date, isAdmin, user]
  );

  return { attendanceList, isLoading, error, saveAttendance };
};
