import React, { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { StudentInterface } from '/src/interfaces/student';
import { createReportStudent } from '/src/lib/reports/report-data';
import { downloadExcelReports, printReports } from '/src/lib/reports/report-export';

interface ReportExportControlsProps {
  student: StudentInterface;
  students: StudentInterface[];
}

const ReportExportControls: React.FC<ReportExportControlsProps> = ({ student, students }) => {
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const classmates = useMemo(() => (student.class ? students.filter((item) => item.class === student.class) : []), [student.class, students]);

  const handleExport = async (target: 'student' | 'class') => {
    const targetStudents = target === 'student' ? [student] : classmates;
    if (targetStudents.length === 0) {
      enqueueSnackbar('Tidak ada data siswa di kelas ini.', { variant: 'error' });
      return;
    }

    setIsExporting(true);
    try {
      const reports = targetStudents.map(createReportStudent);
      if (format === 'pdf') await printReports(reports);
      else await downloadExcelReports(reports);
      if (format === 'pdf') enqueueSnackbar('Dialog cetak dibuka. Pilih "Simpan sebagai PDF" untuk mengunduh.');
    } catch (error) {
      console.error('Gagal mengekspor rapor', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'File rapor gagal dibuat.', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Ekspor Rapor</h2>
          <p className="mt-1 text-sm text-slate-500">Ekspor siswa ini atau semua siswa di kelas {student.class || '-'}.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm font-medium text-slate-600">
            Format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as 'pdf' | 'xlsx')}
              disabled={isExporting}
              className="mt-1 block w-full min-w-[190px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 outline-none focus:border-primary-1"
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel (.xlsx)</option>
            </select>
          </label>

          <Button
            onClick={() => handleExport('student')}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary-1 px-4 py-2 text-white hover:bg-primary-3"
          >
            <Icon icon="solar:download-minimalistic-bold" width={18} />
            <span>{isExporting ? 'Membuat...' : 'Unduh Siswa'}</span>
          </Button>

          <Button
            onClick={() => handleExport('class')}
            disabled={isExporting || classmates.length === 0}
            variant="gost"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            <Icon icon="solar:users-group-rounded-bold" width={18} />
            <span>Unduh Kelas ({classmates.length})</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportExportControls;
