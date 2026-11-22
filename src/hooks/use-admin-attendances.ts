import { useEffect, useState, useCallback } from 'react';
// supabase
import { supabase } from '/src/supabase';
import { subscribeToTableChanges } from '/src/supabase/realtime';
// interfaces
import { TeacherAttendanceInterface, TeacherAttendanceStatus } from '/src/interfaces/attendance';

interface UseAdminAttendancesInterface {
  attendances: TeacherAttendanceInterface[];
  isLoading: boolean;
  error: string;
  updateAttendance: (attendanceId: string, status: TeacherAttendanceStatus, note: string, adminId: string, adminName: string) => Promise<void>;
  verifyAttendance: (attendanceId: string, adminId: string, adminName: string) => Promise<void>;
}

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

export const useAdminAttendances = (date: string): UseAdminAttendancesInterface => {
  const [attendances, setAttendances] = useState<TeacherAttendanceInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAttendances = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('date', date);

      if (fetchErr) throw fetchErr;

      setAttendances(
        (data || [])
          .map(mapAttendance)
          .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'id'))
      );
    } catch (err: any) {
      console.error('Failed to load teacher attendances for admin', err);
      setError('Data absensi tidak dapat dimuat. Periksa koneksi.');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setIsLoading(true);
    setError('');

    fetchAttendances();

    const unsubscribe = subscribeToTableChanges('teacher_attendance', fetchAttendances, `date=eq.${date}`);

    return () => {
      unsubscribe();
    };
  }, [date, fetchAttendances]);

  const updateAttendance = async (attendanceId: string, status: TeacherAttendanceStatus, note: string, adminId: string, adminName: string) => {
    if (status === 'absent' && !note.trim()) throw new Error('Catatan wajib diisi jika tidak hadir.');

    const updatedAt = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('teacher_attendance')
      .update({
        status: status === 'present' ? 'Hadir' : 'Tidak hadir',
        note: status === 'absent' ? note.trim() : '',
        checked_in_at: status === 'present' ? updatedAt : null,
        updated_at: updatedAt,
        updated_by: adminId,
        updated_by_name: adminName,
        is_verified: false,
        verified_by: null,
        verified_by_name: null,
        verified_at: null,
      })
      .eq('id', attendanceId);

    if (updateErr) throw updateErr;

    setAttendances((prev) =>
      prev.map((item) =>
        item.id === attendanceId
          ? {
              ...item,
              status,
              note: status === 'absent' ? note.trim() : '',
              isVerified: false,
              verifiedBy: null,
              verifiedByName: null,
              verifiedAt: null,
            }
          : item
      )
    );
  };

  const verifyAttendance = async (attendanceId: string, adminId: string, adminName: string) => {
    const verifiedAt = new Date().toISOString();

    const { error: verifyErr } = await supabase
      .from('teacher_attendance')
      .update({
        is_verified: true,
        verified_by: adminId,
        verified_by_name: adminName,
        verified_at: verifiedAt,
        updated_at: verifiedAt,
        updated_by: adminId,
        updated_by_name: adminName,
      })
      .eq('id', attendanceId);

    if (verifyErr) throw verifyErr;

    setAttendances((prev) =>
      prev.map((item) =>
        item.id === attendanceId
          ? {
              ...item,
              isVerified: true,
              verifiedBy: adminId,
              verifiedByName: adminName,
              verifiedAt,
            }
          : item
      )
    );
  };

  return { attendances, isLoading, error, updateAttendance, verifyAttendance };
};
