import { useState, useCallback } from 'react';
import { supabase } from '/src/lib/supabase';

export type TeacherAttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa';

export interface TeacherAttendanceInterface {
  id?: string;
  userId: string;
  tanggal: string; // 'YYYY-MM-DD'
  status: TeacherAttendanceStatus;
  jamMasuk?: string | null;
  jamPulang?: string | null;
  keterangan?: string | null;
}

const mapRow = (r: any): TeacherAttendanceInterface => ({
  id: r.id,
  userId: r.user_id,
  tanggal: r.tanggal,
  status: r.status,
  jamMasuk: r.jam_masuk,
  jamPulang: r.jam_pulang,
  keterangan: r.keterangan,
});

const toRow = (i: TeacherAttendanceInterface, dicatatOleh?: string) => ({
  user_id: i.userId,
  tanggal: i.tanggal,
  status: i.status,
  jam_masuk: i.jamMasuk ?? null,
  jam_pulang: i.jamPulang ?? null,
  keterangan: i.keterangan ?? null,
  dicatat_oleh: dicatatOleh ?? null,
  updated_at: new Date().toISOString(),
});

export const useDatabaseTeacherAttendance = () => {
  const [rows, setRows] = useState<TeacherAttendanceInterface[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Absensi semua guru pada satu tanggal
  const fetchByDate = useCallback(async (tanggal: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.from('absensi_guru').select('*').eq('tanggal', tanggal);
    setIsLoading(false);
    if (error) throw error;
    const list = (data ?? []).map(mapRow);
    setRows(list);
    return list;
  }, []);

  // Riwayat satu guru dalam rentang tanggal
  const fetchByTeacher = useCallback(async (userId: string, dari: string, sampai: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('absensi_guru')
      .select('*')
      .eq('user_id', userId)
      .gte('tanggal', dari)
      .lte('tanggal', sampai)
      .order('tanggal', { ascending: true });
    setIsLoading(false);
    if (error) throw error;
    const list = (data ?? []).map(mapRow);
    setRows(list);
    return list;
  }, []);

  // Simpan satu atau banyak (upsert, aman dipanggil berulang)
  const save = useCallback(async (items: TeacherAttendanceInterface[], dicatatOleh?: string) => {
    const { error } = await supabase
      .from('absensi_guru')
      .upsert(items.map((i) => toRow(i, dicatatOleh)), { onConflict: 'user_id,tanggal' });
    if (error) throw error;
  }, []);

  // Guru absen masuk hari ini
  const checkIn = useCallback(async (userId: string) => {
    const now = new Date();
    const tanggal = now.toLocaleDateString('en-CA'); // YYYY-MM-DD (waktu lokal)
    const jam = now.toTimeString().slice(0, 8);
    const { error } = await supabase
      .from('absensi_guru')
      .upsert(
        { user_id: userId, tanggal, status: 'hadir', jam_masuk: jam, dicatat_oleh: userId, updated_at: now.toISOString() },
        { onConflict: 'user_id,tanggal' }
      );
    if (error) throw error;
  }, []);

  // Guru absen pulang hari ini
  const checkOut = useCallback(async (userId: string) => {
    const now = new Date();
    const tanggal = now.toLocaleDateString('en-CA');
    const jam = now.toTimeString().slice(0, 8);
    const { error } = await supabase
      .from('absensi_guru')
      .update({ jam_pulang: jam, updated_at: now.toISOString() })
      .eq('user_id', userId)
      .eq('tanggal', tanggal);
    if (error) throw error;
  }, []);

  // Rekap dalam rentang tanggal
  const fetchRecap = useCallback(async (userId: string, dari: string, sampai: string) => {
    const { data, error } = await supabase
      .from('absensi_guru')
      .select('status')
      .eq('user_id', userId)
      .gte('tanggal', dari)
      .lte('tanggal', sampai);
    if (error) throw error;
    const n = (s: string) => (data ?? []).filter((d) => d.status === s).length;
    return { hadir: n('hadir'), sakit: n('sakit'), izin: n('izin'), alpa: n('alpa') };
  }, []);

  return { rows, isLoading, fetchByDate, fetchByTeacher, save, checkIn, checkOut, fetchRecap };
};