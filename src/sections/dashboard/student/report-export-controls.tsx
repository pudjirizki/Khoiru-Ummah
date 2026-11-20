import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { StudentInterface } from '/src/interfaces/student';
import { FinalFormInterface } from '/src/interfaces/final-form';
import { AssessmentInterface } from '/src/interfaces/assessment';
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
import { UserInterface } from '/src/interfaces/user';
import { createReportStudent, extractScoresFromAssessment } from '/src/lib/reports/report-data';
import { downloadExcelReports, printReports } from '/src/lib/reports/report-export';

interface ReportExportControlsProps {
  student: StudentInterface;
  students: StudentInterface[];
  forms?: FinalFormInterface[];
  studentAssessments?: FinalAssessmentInterface[];
  allAssessments?: AssessmentInterface[];
  users?: UserInterface[];
  selectedFormId?: string;
  onSelectFormId?: (formId: string) => void;
  fetchFinalAssessmentById?: (id: string) => Promise<FinalAssessmentInterface | null>;
  fetchFinalFormById?: (id: string) => Promise<FinalFormInterface | null>;
}

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ReportExportControls: React.FC<ReportExportControlsProps> = ({
  student,
  students,
  forms = [],
  studentAssessments = [],
  allAssessments = [],
  users = [],
  selectedFormId = '',
  onSelectFormId,
  fetchFinalAssessmentById,
  fetchFinalFormById,
}) => {
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [reportDate, setReportDate] = useState<string>(getTodayDateString);
  const [activeFormId, setActiveFormId] = useState<string>(selectedFormId || forms[0]?.id || '');
  const [isExporting, setIsExporting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (selectedFormId) {
      setActiveFormId(selectedFormId);
    } else if (forms.length > 0 && !activeFormId) {
      setActiveFormId(forms[0].id);
    }
  }, [selectedFormId, forms, activeFormId]);

  const classmates = useMemo(
    () => (student.class ? students.filter((item) => item.class === student.class) : []),
    [student.class, students]
  );

  const handleFormChange = (newFormId: string) => {
    setActiveFormId(newFormId);
    if (onSelectFormId) {
      onSelectFormId(newFormId);
    }
  };

  const handleExport = async (target: 'student' | 'class') => {
    const targetStudents = target === 'student' ? [student] : classmates;
    if (targetStudents.length === 0) {
      enqueueSnackbar('Tidak ada data siswa di kelas ini.', { variant: 'error' });
      return;
    }

    setIsExporting(true);
    try {
      let activeForm = forms.find((f) => f.id === activeFormId);
      if (!activeForm && activeFormId && fetchFinalFormById) {
        activeForm = (await fetchFinalFormById(activeFormId)) ?? undefined;
      }
      if (!activeForm && forms.length > 0) {
        activeForm = forms[0];
      }

      let detectedAcademicYear: string | undefined;
      let detectedSemester: string | undefined;
      if (activeForm?.title) {
        const matchYear = activeForm.title.match(/20\d{2}\/20\d{2}/);
        if (matchYear) detectedAcademicYear = matchYear[0];
        if (/semester\s*(1|i\b|ganjil)/i.test(activeForm.title)) detectedSemester = 'I';
        else if (/semester\s*(2|ii\b|genap)/i.test(activeForm.title)) detectedSemester = 'II';
      }

      const studentAssessmentMap = new Map<string, FinalAssessmentInterface[]>();

      studentAssessments.forEach((a) => {
        const sId = a.studenId || (a as any).studentId;
        if (!studentAssessmentMap.has(sId)) {
          studentAssessmentMap.set(sId, []);
        }
        studentAssessmentMap.get(sId)!.push(a);
      });

      for (const targetStudent of targetStudents) {
        if (!studentAssessmentMap.has(targetStudent.id)) {
          const matched = allAssessments.filter(
            (a) =>
              (a.studenId === targetStudent.id || (a as any).studentId === targetStudent.id) &&
              (!activeForm || a.formId === activeForm.id)
          );

          if (matched.length > 0 && fetchFinalAssessmentById) {
            const fetched = await Promise.all(matched.map((m) => fetchFinalAssessmentById(m.id)));
            const valid = fetched.filter((f): f is FinalAssessmentInterface => f !== null);
            studentAssessmentMap.set(targetStudent.id, valid);
          } else {
            studentAssessmentMap.set(targetStudent.id, []);
          }
        }
      }

      const reports = targetStudents.map((tgtStudent) => {
        const assts = studentAssessmentMap.get(tgtStudent.id) ?? [];
        const { sikapItems, perilakuItems } = extractScoresFromAssessment(
          tgtStudent.id,
          activeForm,
          assts,
          users
        );

        return createReportStudent(tgtStudent, {
          reportDate,
          academicYear: detectedAcademicYear,
          semester: detectedSemester,
          sikapItems,
          perilakuItems,
        });
      });

      if (format === 'pdf') await printReports(reports);
      else await downloadExcelReports(reports);

      if (format === 'pdf') {
        enqueueSnackbar('Dialog cetak dibuka. Pilih "Simpan sebagai PDF" untuk mengunduh.');
      } else {
        enqueueSnackbar('File Excel berhasil diunduh.');
      }
    } catch (error) {
      console.error('Gagal mengekspor rapor', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'File rapor gagal dibuat.', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const studentFirstName = student.name?.trim().split(' ')[0] || 'Siswa';

  return (
    <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      {/* Header Bagian Ekspor */}
      <div className="flex flex-col gap-3 pb-5 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-1/10 text-primary-1">
            <Icon icon="solar:document-text-bold" width={26} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ekspor Lembar Rapor</h2>
            <p className="text-xs text-slate-500">
              Cetak atau unduh lembar rapor Sikap & Perilaku sesuai hasil penilaian formulir
            </p>
          </div>
        </div>

        <div className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <Icon icon="solar:users-group-rounded-linear" width={17} className="text-slate-500" />
          <span>Kelas {student.class || '-'} • {classmates.length} Siswa</span>
        </div>
      </div>

      {/* Grid Pengaturan: Formulir Penilaian, Tanggal Rapor, Format File */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Formulir Penilaian */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Formulir Penilaian (Sumber Nilai)
          </label>
          {forms.length > 0 ? (
            <select
              value={activeFormId}
              onChange={(event) => handleFormChange(event.target.value)}
              disabled={isExporting}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-1 focus:bg-white focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
            >
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title || 'Formulir tanpa judul'}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex h-11 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-400">
              Tidak ada formulir penilaian
            </div>
          )}
        </div>

        {/* 2. Tanggal Rapor */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tanggal Rapor (Tanda Tangan)
          </label>
          <input
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            disabled={isExporting}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-1 focus:bg-white focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
          />
        </div>

        {/* 3. Format File */}
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Format Dokumen
          </label>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as 'pdf' | 'xlsx')}
            disabled={isExporting}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-1 focus:bg-white focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
          >
            <option value="pdf">PDF (Buka & Cetak Dokumen)</option>
            <option value="xlsx">Excel (.xlsx Spreadsheet)</option>
          </select>
        </div>
      </div>

      {/* Tombol Aksi Download */}
      <div className="mt-6 flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-end">
        <Button
          onClick={() => handleExport('class')}
          disabled={isExporting || classmates.length === 0}
          variant="gost"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Icon icon="solar:users-group-rounded-bold" width={20} className="text-slate-500" />
          <span>Unduh Semua Siswa ({classmates.length} Rapor)</span>
        </Button>

        <Button
          onClick={() => handleExport('student')}
          disabled={isExporting}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-1 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-3 disabled:opacity-50"
        >
          <Icon icon="solar:download-minimalistic-bold" width={20} />
          <span>{isExporting ? 'Memproses Data...' : `Unduh Rapor (${studentFirstName})`}</span>
        </Button>
      </div>
    </div>
  );
};

export default ReportExportControls;
