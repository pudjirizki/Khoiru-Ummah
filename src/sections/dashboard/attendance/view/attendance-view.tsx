import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useSnackbar } from '/src/components/snackbar';
// hooks
import { useDatabaseAttendance } from '/src/hooks/use-database-attendance';
import { useDatabaseUser } from '/src/hooks/use-database-user';
// interfaces
import { TeacherAttendanceStatus } from '/src/interfaces/attendance';
// components
import { Button } from '/src/components/button';
import { LoadingScreen } from '/src/components/loading-screen';

const getLocalDate = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const AttendanceView: React.FC = () => {
  const { currentUser, isLoadingUser } = useDatabaseUser();
  const teacher = currentUser?.databaseUsers?.role === 'teacher' ? currentUser.databaseUsers : null;
  const date = getLocalDate();
  const { attendance, isLoading, isSaving, error, saveAttendance } = useDatabaseAttendance(teacher, date);
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<TeacherAttendanceStatus>('present');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!attendance) {
      setStatus('present');
      setNote('');
      return;
    }

    setStatus(attendance.status);
    setNote(attendance.note);
  }, [attendance]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (status === 'absent' && !note.trim()) {
      enqueueSnackbar('Catatan wajib diisi jika tidak hadir.', { variant: 'error' });
      return;
    }

    try {
      await saveAttendance(status, note);
      enqueueSnackbar('Absensi berhasil disimpan.');
    } catch (saveError) {
      console.error('Failed to save teacher attendance', saveError);
      enqueueSnackbar(saveError instanceof Error ? saveError.message : 'Absensi gagal disimpan.', { variant: 'error' });
    }
  };

  if (isLoadingUser) return <LoadingScreen />;

  if (!teacher) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        Halaman absensi ini hanya tersedia untuk akun guru.
      </section>
    );
  }

  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Kehadiran</p>
        <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Absensi Guru</h1>
        <p className="mt-2 text-slate-500">Catat kehadiran Anda untuk hari ini.</p>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-green-100 bg-green-50 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-primary-1 shadow-sm">
          <Icon icon="mdi:calendar-today" width={26} />
        </span>
        <div>
          <p className="text-sm text-slate-500">Tanggal absensi</p>
          <p className="font-semibold capitalize text-slate-800">{formattedDate}</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md md:p-8">
          {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

          <fieldset disabled={isSaving || Boolean(error)} className="space-y-5">
            <legend className="mb-4 text-lg font-semibold text-slate-800">Pilih status kehadiran</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              {([
                { value: 'present', label: 'Hadir', icon: 'mdi:check-circle-outline', color: 'green' },
                { value: 'absent', label: 'Tidak Hadir', icon: 'mdi:close-circle-outline', color: 'red' },
              ] as const).map((option) => {
                const selected = status === option.value;
                const selectedStyle =
                  option.value === 'present'
                    ? 'border-green-500 bg-green-50 text-green-800 ring-2 ring-green-100'
                    : 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-100';

                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-5 transition ${selected ? selectedStyle : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    <input
                      type="radio"
                      name="attendanceStatus"
                      value={option.value}
                      checked={selected}
                      onChange={() => setStatus(option.value)}
                      className="h-4 w-4 accent-green-700"
                    />
                    <Icon icon={option.icon} width={26} />
                    <span className="font-semibold">{option.label}</span>
                  </label>
                );
              })}
            </div>

            {status === 'absent' && (
              <div>
                <label htmlFor="attendance-note" className="mb-2 block text-sm font-medium text-slate-700">
                  Catatan ketidakhadiran <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="attendance-note"
                  required
                  maxLength={500}
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Tuliskan alasan tidak hadir"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary-1 focus:ring-2 focus:ring-primary-1/15"
                />
                <p className="mt-1 text-right text-xs text-slate-400">{note.length}/500</p>
              </div>
            )}
          </fieldset>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {attendance && (
              <p className={`text-sm ${attendance.isVerified ? 'text-green-700' : 'text-amber-700'}`}>
                {attendance.isVerified ? `Absensi sudah diverifikasi${attendance.verifiedByName ? ` oleh ${attendance.verifiedByName}` : ''}.` : 'Absensi sudah dikirim dan menunggu verifikasi admin.'}
              </p>
            )}
            <Button type="submit" disabled={isSaving || isLoading || Boolean(error)} className="rounded-xl bg-primary-1 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-primary-3 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto">
              {isSaving ? 'Menyimpan...' : attendance ? 'Perbarui Absensi' : 'Simpan Absensi'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

export default AttendanceView;
