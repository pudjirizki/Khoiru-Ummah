import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '/src/lib/supabase';
// firebase fallback
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
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

export const useAdminAttendances = (date: string): UseAdminAttendancesInterface => {
  const [attendances, setAttendances] = useState<TeacherAttendanceInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAttendances = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Try Supabase snake_case table
      let { data, error: err } = await supabase
        .from('teacher_attendances')
        .select('*')
        .eq('date', date);

      // 2. Try Supabase camelCase table
      if (err) {
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('teacherAttendances')
          .select('*')
          .eq('date', date);

        if (!fallbackErr && fallbackData) {
          data = fallbackData;
          err = null;
        }
      }

      // 3. Fallback to Firestore if Supabase table does not exist yet
      if (err) {
        try {
          const attendanceQuery = query(collection(fbFirestore, 'teacherAttendances'), where('date', '==', date));
          const snap = await getDocs(attendanceQuery);
          const list = snap.docs
            .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
            .map(mapAttendance)
            .sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'id'));
          setAttendances(list);
          setIsLoading(false);
          return;
        } catch (fsErr) {
          console.warn('Firestore fallback also failed:', fsErr);
          throw err;
        }
      }

      const list = (data ?? []).map(mapAttendance).sort((a, b) => a.teacherName.localeCompare(b.teacherName, 'id'));
      setAttendances(list);
    } catch (err: any) {
      console.error('Failed to load teacher attendances for admin', err);
      setError('Tabel absensi belum ada di Supabase. Silakan buat tabel teacher_attendances melalui SQL Editor Supabase.');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAttendances();

    const channel = supabase
      .channel(`admin-attendances-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_attendances' }, () => {
        fetchAttendances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAttendances]);

  const updateAttendance = async (attendanceId: string, status: TeacherAttendanceStatus, note: string) => {
    if (status === 'absent' && !note.trim()) throw new Error('Catatan wajib diisi jika tidak hadir.');

    const now = new Date().toISOString();
    const updateData = {
      status,
      note: status === 'absent' ? note.trim() : '',
      is_verified: false,
      isVerified: false,
      verified_by: null,
      verifiedBy: null,
      verified_by_name: null,
      verifiedByName: null,
      verified_at: null,
      verifiedAt: null,
      updated_at: now,
      updatedAt: now,
    };

    let { error: err } = await supabase.from('teacher_attendances').update(updateData).eq('id', attendanceId);
    if (err) {
      const { error: err2 } = await supabase.from('teacherAttendances').update(updateData).eq('id', attendanceId);
      if (err2) {
        // Fallback update to Firestore
        try {
          await updateDoc(doc(fbFirestore, 'teacherAttendances', attendanceId), updateData);
        } catch {}
      }
    }

    setAttendances((prev) =>
      prev.map((a) => (a.id === attendanceId ? { ...a, status, note: status === 'absent' ? note.trim() : '', isVerified: false } : a))
    );
  };

  const verifyAttendance = async (attendanceId: string, adminId: string, adminName: string) => {
    const now = new Date().toISOString();
    const updateData = {
      is_verified: true,
      isVerified: true,
      verified_by: adminId,
      verifiedBy: adminId,
      verified_by_name: adminName,
      verifiedByName: adminName,
      verified_at: now,
      verifiedAt: now,
      updated_at: now,
      updatedAt: now,
    };

    let { error: err } = await supabase.from('teacher_attendances').update(updateData).eq('id', attendanceId);
    if (err) {
      const { error: err2 } = await supabase.from('teacherAttendances').update(updateData).eq('id', attendanceId);
      if (err2) {
        // Fallback update to Firestore
        try {
          await updateDoc(doc(fbFirestore, 'teacherAttendances', attendanceId), updateData);
        } catch {}
      }
    }

    setAttendances((prev) =>
      prev.map((a) => (a.id === attendanceId ? { ...a, isVerified: true, verifiedBy: adminId, verifiedByName: adminName, verifiedAt: now } : a))
    );
  };

  return { attendances, isLoading, error, updateAttendance, verifyAttendance };
};
