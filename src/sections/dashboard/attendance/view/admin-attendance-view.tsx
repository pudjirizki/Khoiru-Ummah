import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useSnackbar } from '/src/components/snackbar';
// hooks
import { useAdminAttendances } from '/src/hooks/use-admin-attendances';
import { useDatabaseUser } from '/src/hooks/use-database-user';
// interfaces
import { TeacherAttendanceInterface, TeacherAttendanceStatus } from '/src/interfaces/attendance';
// components
import { Button } from '/src/components/button';
import { LoadingScreen } from '/src/components/loading-screen';

const getLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface AttendanceRowProps {
  attendance: TeacherAttendanceInterface;
  isBusy: boolean;
  onSave: (attendanceId: string, status: TeacherAttendanceStatus, note: string) => Promise<boolean>;
  onVerify: (attendanceId: string) => Promise<void>;
}

const AttendanceRow: React.FC<AttendanceRowProps> = ({ attendance, isBusy, onSave, onVerify }) => {
  const [status, setStatus] = useState<TeacherAttendanceStatus>(attendance.status);
  const [note, setNote] = useState(attendance.note || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    if (await onSave(attendance.id, status, note)) setIsEditing(false);
  };

  return (
    <article className="rounded-2xl border border-slate-200 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">{attendance.teacherName}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Status guru: <span className="font-medium">{attendance.status === 'present' ? 'Hadir' : 'Tidak Hadir'}</span>
          </p>
          {attendance.status === 'absent' && <p className="mt-1 text-sm text-slate-600">Catatan: {attendance.note}</p>}
          <p className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${attendance.isVerified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            <Icon icon={attendance.isVerified ? 'mdi:check-decagram' : 'mdi:clock-outline'} width={16} />
            {attendance.isVerified ? `Terverifikasi${attendance.verifiedByName ? ` oleh ${attendance.verifiedByName}` : ''}` : 'Menunggu verifikasi'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outlined"
            disabled={isBusy}
            onClick={() => setIsEditing((current) => !current)}
            className="rounded-xl px-4 py-2"
          >
            {isEditing ? 'Batal' : 'Edit'}
          </Button>
          {!attendance.isVerified && (
            <Button
              type="button"
              disabled={isBusy}
              onClick={() => onVerify(attendance.id)}
              className="rounded-xl bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {isBusy ? 'Memproses...' : 'Verifikasi'}
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <fieldset disabled={isBusy} className="space-y-3">
            <legend className="mb-2 text-sm font-medium text-slate-700">Ubah status absensi</legend>
            <div className="flex flex-wrap gap-4">
              {([
                { value: 'present', label: 'Hadir' },
                { value: 'absent', label: 'Tidak Hadir' },
              ] as const).map((option) => (
                <label key={option.value} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name={`status-${attendance.id}`}
                    value={option.value}
                    checked={status === option.value}
                    onChange={() => setStatus(option.value)}
                    className="h-4 w-4 accent-green-700"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {status === 'absent' && (
              <div>
                <label htmlFor={`note-${attendance.id}`} className="mb-2 block text-sm font-medium text-slate-700">
                  Catatan ketidakhadiran <span className="text-red-600">*</span>
                </label>
                <textarea
                  id={`note-${attendance.id}`}
                  required
                  maxLength={500}
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 outline-none focus:border-primary-1 focus:ring-2 focus:ring-primary-1/15"
                  placeholder="Alasan tidak hadir"
                />
              </div>
            )}
          </fieldset>
          <Button
            type="button"
            disabled={isBusy || (status === 'absent' && !note.trim())}
            onClick={handleSave}
            className="rounded-xl bg-primary-1 px-5 py-2 font-semibold text-white hover:bg-primary-3 disabled:opacity-60"
          >
            {isBusy ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      )}
    </article>
  );
};

const AdminAttendanceView: React.FC = () => {
  const { currentUser, isLoadingUser } = useDatabaseUser();
  const admin = currentUser?.databaseUsers?.role === 'admin' ? currentUser.databaseUsers : null;
  const date = getLocalDate();
  const { attendances, isLoading, error, updateAttendance, verifyAttendance } = useAdminAttendances(date);
  const { enqueueSnackbar } = useSnackbar();
  const [busyAttendanceId, setBusyAttendanceId] = useState('');

  const handleSave = async (attendanceId: string, status: TeacherAttendanceStatus, note: string): Promise<boolean> => {
    setBusyAttendanceId(attendanceId);
    try {
      await updateAttendance(attendanceId, status, note);
      enqueueSnackbar('Perubahan tersimpan. Absensi menunggu verifikasi kembali.');
      return true;
    } catch (saveError) {
      console.error('Failed to update teacher attendance', saveError);
      enqueueSnackbar(saveError instanceof Error ? saveError.message : 'Perubahan absensi gagal disimpan.', { variant: 'error' });
      return false;
    } finally {
      setBusyAttendanceId('');
    }
  };

  const handleVerify = async (attendanceId: string) => {
    if (!admin) return;
    setBusyAttendanceId(attendanceId);
    try {
      await verifyAttendance(attendanceId, admin.id, admin.name);
      enqueueSnackbar('Absensi berhasil diverifikasi.');
    } catch (verifyError) {
      console.error('Failed to verify teacher attendance', verifyError);
      enqueueSnackbar(verifyError instanceof Error ? verifyError.message : 'Absensi gagal diverifikasi.', { variant: 'error' });
    } finally {
      setBusyAttendanceId('');
    }
  };

  if (isLoadingUser) return <LoadingScreen />;

  if (!admin) {
    return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">Halaman pengelolaan absensi ini hanya tersedia untuk admin.</section>;
  }

  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Pengelolaan Kehadiran</p>
        <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Verifikasi Absensi Guru</h1>
        <p className="mt-2 text-slate-500">Tinjau dan verifikasi absensi guru untuk {formattedDate}.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total absensi masuk</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{attendances.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">Menunggu verifikasi</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{attendances.filter((item) => !item.isVerified).length}</p>
        </div>
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <p className="text-sm text-green-800">Terverifikasi</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{attendances.filter((item) => item.isVerified).length}</p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {isLoading ? (
        <LoadingScreen />
      ) : attendances.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">Belum ada guru yang mengirim absensi hari ini.</div>
      ) : (
        <div className="space-y-4">
          {attendances.map((attendance) => (
            <AttendanceRow
              key={attendance.id}
              attendance={attendance}
              isBusy={busyAttendanceId === attendance.id}
              onSave={handleSave}
              onVerify={handleVerify}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default AdminAttendanceView;
