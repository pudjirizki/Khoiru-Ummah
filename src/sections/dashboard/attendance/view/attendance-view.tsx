import React, { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
// hooks
import { useDatabaseAttendance } from '/src/hooks/use-database-attendance';
import { useDatabaseUser } from '/src/hooks/use-database-user';
// interfaces
import { TeacherAttendanceInterface, TeacherAttendanceStatusType } from '/src/interfaces/attendance';
import { UserInterface } from '/src/interfaces/user';

const attendanceStatuses: TeacherAttendanceStatusType[] = ['Hadir', 'Tidak hadir'];

const getAttendanceStatus = (record?: TeacherAttendanceInterface): TeacherAttendanceStatusType | '' => {
  if (!record) return '';
  return record.status === 'Hadir' ? 'Hadir' : 'Tidak hadir';
};

const formatAttendanceTime = (date: Date | null) => (date ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : 'Belum ada waktu hadir');

const getAttendanceBadgeClass = (record?: TeacherAttendanceInterface) => {
  if (!record) return 'bg-amber-50 text-amber-700';
  return record.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
};

const getToday = () => {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
};

interface AttendanceEditorProps {
  teacher: UserInterface;
  date: string;
  record?: TeacherAttendanceInterface;
  onSave: (teacher: UserInterface, status: TeacherAttendanceStatusType, note: string) => Promise<void>;
  onSaved: () => void;
}

const AttendanceEditor: React.FC<AttendanceEditorProps> = ({ teacher, date, record, onSave, onSaved }) => {
  const [status, setStatus] = useState<TeacherAttendanceStatusType | ''>(getAttendanceStatus(record));
  const [note, setNote] = useState(record?.note ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  React.useEffect(() => {
    setStatus(getAttendanceStatus(record));
    setNote(record?.note ?? '');
  }, [record?.id, record?.status, record?.note, date]);

  const handleSave = async () => {
    if (!status) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await onSave(teacher, status, note);
      onSaved();
    } catch (error) {
      console.error('save teacher attendance error', error);
      setSaveError('Absensi gagal disimpan. Periksa koneksi atau izin akses, lalu coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <label className="flex min-w-36 flex-1 flex-col gap-2 text-sm text-slate-600">
        Status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as TeacherAttendanceStatusType | '')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-700 outline-none focus:border-[#56355F] focus:ring-2 focus:ring-[#56355F]/10"
        >
          <option value="">Pilih status</option>
          {attendanceStatuses.map((attendanceStatus) => (
            <option key={attendanceStatus} value={attendanceStatus}>
              {attendanceStatus}
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-48 flex-[2] flex-col gap-2 text-sm text-slate-600">
        Catatan (opsional)
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          placeholder="Catatan tambahan (opsional)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#56355F] focus:ring-2 focus:ring-[#56355F]/10"
        />
      </label>

      <button
        type="button"
        disabled={!status || isSaving}
        onClick={handleSave}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#56355F] px-5 py-3 font-semibold text-white transition hover:bg-[#44294b] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon icon={isSaving ? 'line-md:loading-twotone-loop' : 'mdi:content-save'} width={19} />
        {isSaving ? 'Menyimpan...' : record ? 'Perbarui' : 'Simpan'}
      </button>
      {saveError && <p className="text-sm text-rose-600 md:basis-full">{saveError}</p>}
    </div>
  );
};

const AttendanceView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [savedMessage, setSavedMessage] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | TeacherAttendanceStatusType | 'Belum diisi'>('Semua');
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const { currentUser, allUsersCache, isLoadingUser, isLoadingAllUsers, allUsersError } = useDatabaseUser();
  const user = currentUser?.databaseUsers ?? null;
  const isAdmin = user?.role === 'admin';
  const date = isAdmin ? selectedDate : getToday();
  const teachers = useMemo(() => allUsersCache.filter((listedUser) => listedUser.role === 'teacher'), [allUsersCache]);
  const { attendanceList, isLoading, error, saveAttendance } = useDatabaseAttendance(date, user, isAdmin);
  const recordsByTeacher = useMemo(() => new Map(attendanceList.map((record) => [record.teacherId, record])), [attendanceList]);
  const filteredTeachers = useMemo(() => {
    const search = teacherSearch.trim().toLocaleLowerCase();
    return teachers.filter((teacher) => {
      const attendance = recordsByTeacher.get(teacher.id);
      const matchesSearch = !search || teacher.name.toLocaleLowerCase().includes(search) || teacher.email.toLocaleLowerCase().includes(search);
      const matchesStatus =
        statusFilter === 'Semua' ||
        (statusFilter === 'Belum diisi' ? !attendance : attendance?.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [recordsByTeacher, statusFilter, teacherSearch, teachers]);

  const handleSaved = () => {
    setSavedMessage('Absensi berhasil disimpan.');
    window.setTimeout(() => setSavedMessage(''), 3500);
  };

  if (isLoadingUser) {
    return <p className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">Memuat informasi akun...</p>;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return <p className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">Halaman absensi hanya dapat diakses oleh admin dan guru.</p>;
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Kehadiran</p>
          <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Absensi Guru</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isAdmin ? 'Lihat, bantu isi, atau perbarui catatan absensi harian guru.' : 'Catat kehadiran Anda untuk hari ini.'}
          </p>
        </div>
        {isAdmin && (
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
            Tanggal absensi
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none focus:border-[#56355F] focus:ring-2 focus:ring-[#56355F]/10"
            />
          </label>
        )}
      </header>

      {savedMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{savedMessage}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {isLoading && <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">Memuat data absensi...</p>}
      {isAdmin && isLoadingAllUsers && <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">Memuat daftar guru...</p>}
      {isAdmin && allUsersError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{allUsersError}</p>}

      {!isLoading && !isAdmin && (
        <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#56355F]/10 text-[#56355F]">
              <Icon icon="mdi:account-check" width={24} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-800">{user.name}</h2>
              <p className="text-sm text-slate-500">Tanggal: {date}</p>
              {recordsByTeacher.get(user.id)?.status === 'Hadir' && (
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-700">
                  <Icon icon="mdi:clock-check-outline" width={17} />
                  Hadir pukul {formatAttendanceTime(recordsByTeacher.get(user.id)?.checkedInAt ?? null)}
                </p>
              )}
            </div>
          </div>
          {recordsByTeacher.has(user.id) ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              <Icon icon="mdi:check-circle" width={21} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Absensi hari ini sudah tercatat.</p>
                <p className="mt-1">Guru hanya dapat mencatat absensi satu kali per hari. Hubungi admin jika ada data yang perlu diperbaiki.</p>
              </div>
            </div>
          ) : (
            <AttendanceEditor teacher={user} date={date} record={recordsByTeacher.get(user.id)} onSave={saveAttendance} onSaved={handleSaved} />
          )}
        </article>
      )}

      {!isLoading && isAdmin && !isLoadingAllUsers && (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <label className="relative flex-1">
              <Icon icon="mdi:magnify" width={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Cari nama atau email guru"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-[#56355F] focus:ring-2 focus:ring-[#56355F]/10"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-600 md:min-w-48">
              Filter status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#56355F] focus:ring-2 focus:ring-[#56355F]/10"
              >
                <option value="Semua">Semua status</option>
                <option value="Hadir">Hadir</option>
                <option value="Tidak hadir">Tidak hadir</option>
                <option value="Belum diisi">Belum diisi</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total guru</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{teachers.length}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Hadir</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{teachers.filter((teacher) => recordsByTeacher.get(teacher.id)?.status === 'Hadir').length}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tidak hadir</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">{teachers.filter((teacher) => recordsByTeacher.get(teacher.id)?.status === 'Tidak hadir').length}</p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Belum diisi</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{teachers.filter((teacher) => !recordsByTeacher.has(teacher.id)).length}</p>
            </div>
          </div>

          {teachers.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Belum ada akun guru yang terdaftar.</p>
          ) : filteredTeachers.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Tidak ada guru yang cocok dengan pencarian atau filter ini.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Guru</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Jam hadir</th>
                    <th className="px-5 py-4 font-semibold">Catatan</th>
                    <th className="px-5 py-4 font-semibold">Terakhir diubah</th>
                    <th className="px-5 py-4 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map((teacher) => {
                    const record = recordsByTeacher.get(teacher.id);
                    const isEditing = editingTeacherId === teacher.id;
                    return (
                      <React.Fragment key={teacher.id}>
                        <tr className="align-top">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">{teacher.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{teacher.email || teacher.phoneNumber || 'Guru'}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getAttendanceBadgeClass(record)}`}>
                              {record?.status ?? 'Belum diisi'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {record?.status === 'Hadir' ? (
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                <Icon icon="mdi:clock-outline" width={17} />
                                {formatAttendanceTime(record.checkedInAt)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="max-w-56 whitespace-normal px-5 py-4 text-slate-600">{record?.note || '-'}</td>
                          <td className="px-5 py-4 text-slate-600">
                            {record ? (
                              <>
                                <p>{record.updatedByName || 'Pengguna'}</p>
                                <p className="mt-1 text-xs text-slate-400">{record.updatedAt ? record.updatedAt.toLocaleString('id-ID') : '-'}</p>
                              </>
                            ) : (
                              <span className="text-slate-400">Belum ada catatan</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setEditingTeacherId(isEditing ? null : teacher.id)}
                              className="inline-flex items-center gap-2 rounded-xl border border-[#56355F]/15 px-3 py-2 font-semibold text-[#56355F] transition hover:bg-[#56355F]/5"
                            >
                              <Icon icon={isEditing ? 'mdi:close' : record ? 'mdi:pencil' : 'mdi:plus'} width={17} />
                              {isEditing ? 'Tutup' : record ? 'Ubah' : 'Catat'}
                            </button>
                          </td>
                        </tr>
                        {isEditing && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={6} className="px-5 py-5">
                              <AttendanceEditor
                                teacher={teacher}
                                date={date}
                                record={record}
                                onSave={saveAttendance}
                                onSaved={() => {
                                  handleSaved();
                                  setEditingTeacherId(null);
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AttendanceView;
