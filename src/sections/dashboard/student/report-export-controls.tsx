import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { StudentInterface } from '/src/interfaces/student';
import { FinalFormInterface } from '/src/interfaces/final-form';
import { AssessmentInterface } from '/src/interfaces/assessment';
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
import { UserInterface } from '/src/interfaces/user';
import {
  createReportStudent,
  DEFAULT_KESIMPULAN,
  DEFAULT_KETIDAKHADIRAN,
  DEFAULT_TARAF_BERPIKIR,
  extractScoresFromAssessment,
  KesimpulanReport,
  KetidakhadiranReport,
  TarafBerpikirReport,
} from '/src/lib/reports/report-data';
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

interface ReportExtrasState {
  tarafBerpikir: TarafBerpikirReport;
  ketidakhadiran: KetidakhadiranReport;
  kesimpulan: KesimpulanReport;
}

const REPORT_EXTRAS_STORAGE_KEY = 'ku_rapor_extras_v1';

const createEmptyExtras = (): ReportExtrasState => ({
  tarafBerpikir: { ...DEFAULT_TARAF_BERPIKIR },
  ketidakhadiran: { ...DEFAULT_KETIDAKHADIRAN },
  kesimpulan: { ...DEFAULT_KESIMPULAN },
});

const getExtrasKey = (studentId: string, formId: string): string => `${studentId}::${formId || 'default'}`;

const readAllStoredExtras = (): Record<string, ReportExtrasState> => {
  try {
    const raw = window.localStorage.getItem(REPORT_EXTRAS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const readStudentExtras = (studentId: string, formId: string): ReportExtrasState => {
  const all = readAllStoredExtras();
  const saved = all[getExtrasKey(studentId, formId)] ?? all[getExtrasKey(studentId, 'default')];
  if (!saved) return createEmptyExtras();

  return {
    tarafBerpikir: { ...DEFAULT_TARAF_BERPIKIR, ...(saved.tarafBerpikir ?? {}) },
    ketidakhadiran: { ...DEFAULT_KETIDAKHADIRAN, ...(saved.ketidakhadiran ?? {}) },
    kesimpulan: { ...DEFAULT_KESIMPULAN, ...(saved.kesimpulan ?? {}) },
  };
};

const writeStudentExtras = (studentId: string, formId: string, extras: ReportExtrasState): void => {
  try {
    const all = readAllStoredExtras();
    all[getExtrasKey(studentId, formId)] = extras;
    window.localStorage.setItem(REPORT_EXTRAS_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage quota / private mode errors
  }
};

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TARAF_BERPIKIR_OPTIONS: { key: keyof TarafBerpikirReport; label: string }[] = [
  { key: 'polaPikir', label: 'Pola Pikir' },
  { key: 'berpikirBenar', label: 'Berpikir Benar' },
  { key: 'berpikirSolutif', label: 'Berpikir Solutif' },
  { key: 'berpikirCepat', label: 'Berpikir Cepat' },
];

const KETIDAKHADIRAN_OPTIONS: { key: keyof KetidakhadiranReport; label: string }[] = [
  { key: 'sakit', label: 'Sakit (hari)' },
  { key: 'izin', label: 'Izin (hari)' },
  { key: 'tanpaKeterangan', label: 'Tanpa Keterangan (hari)' },
];

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
  const [extras, setExtras] = useState<ReportExtrasState>(() => readStudentExtras(student.id, selectedFormId || forms[0]?.id || ''));
  const [isExporting, setIsExporting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (selectedFormId && forms.some((f) => f.id === selectedFormId)) {
      setActiveFormId(selectedFormId);
    } else if (forms.length > 0 && (!activeFormId || !forms.some((f) => f.id === activeFormId))) {
      setActiveFormId(forms[0].id);
    }
  }, [selectedFormId, forms, activeFormId]);

  useEffect(() => {
    setExtras(readStudentExtras(student.id, activeFormId));
  }, [student.id, activeFormId]);

  const updateExtras = useCallback(
    (updater: (prev: ReportExtrasState) => ReportExtrasState) => {
      setExtras((prev) => {
        const next = updater(prev);
        writeStudentExtras(student.id, activeFormId, next);
        return next;
      });
    },
    [student.id, activeFormId]
  );

  const classmates = useMemo(
    () => (student.class ? students.filter((item) => item.class === student.class) : []),
    [student.class, students]
  );

  const userMap = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);

  const assessmentStatus = useMemo(() => {
    if (!activeFormId) return { hasTeacher: false, hasParent: false };

    const matchingFromStudent = studentAssessments.filter(
      (a) => (a.studenId === student.id || (a as any).studentId === student.id) && a.formId === activeFormId
    );
    const matchingFromAll = allAssessments.filter(
      (a) => (a.studenId === student.id || (a as any).studentId === student.id) && a.formId === activeFormId
    );
    const combined = matchingFromStudent.length > 0 ? matchingFromStudent : matchingFromAll;

    const hasParent = combined.some((a) => userMap.get(a.userId)?.role === 'parent');
    const hasTeacher = combined.some((a) => {
      const role = userMap.get(a.userId)?.role;
      return role === 'teacher' || role === 'admin';
    });

    return { hasTeacher, hasParent };
  }, [activeFormId, allAssessments, student.id, studentAssessments, userMap]);

  const handleFormChange = (newFormId: string) => {
    setActiveFormId(newFormId);
    if (onSelectFormId) {
      onSelectFormId(newFormId);
    }
  };

  const handleToggleTarafBerpikir = (key: keyof TarafBerpikirReport) => {
    updateExtras((prev) => ({
      ...prev,
      tarafBerpikir: {
        ...prev.tarafBerpikir,
        [key]: !prev.tarafBerpikir[key],
      },
    }));
  };

  const handleChangeKetidakhadiran = (key: keyof KetidakhadiranReport, rawValue: string) => {
    const trimmed = rawValue.trim();
    const parsed = trimmed === '' ? null : Math.max(0, Math.floor(Number(trimmed)));
    const nextValue = parsed !== null && Number.isFinite(parsed) ? parsed : null;

    updateExtras((prev) => ({
      ...prev,
      ketidakhadiran: {
        ...prev.ketidakhadiran,
        [key]: nextValue,
      },
    }));
  };

  const handleChangeKesimpulan = (key: keyof KesimpulanReport, value: string) => {
    updateExtras((prev) => ({
      ...prev,
      kesimpulan: {
        ...prev.kesimpulan,
        [key]: value,
      },
    }));
  };

  const handleExport = async (target: 'student' | 'class') => {
    const targetStudents = target === 'student' ? [student] : classmates;
    if (targetStudents.length === 0) {
      enqueueSnackbar('Tidak ada data siswa di kelas ini.', { variant: 'error' });
      return;
    }

    setIsExporting(true);
    try {
      let activeForm = forms.find((f) => f.id === activeFormId) ?? forms[0];
      const targetFormId = activeForm?.id || activeFormId;

      if ((!activeForm || !Array.isArray(activeForm.criterias) || activeForm.criterias.length === 0) && targetFormId && fetchFinalFormById) {
        const fetchedForm = await fetchFinalFormById(targetFormId);
        if (fetchedForm) activeForm = fetchedForm;
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
        if (activeForm && a.formId !== activeForm.id) return;
        if (!studentAssessmentMap.has(sId)) {
          studentAssessmentMap.set(sId, []);
        }
        studentAssessmentMap.get(sId)!.push(a);
      });

      for (const targetStudent of targetStudents) {
        const existing = studentAssessmentMap.get(targetStudent.id);
        if (!existing || existing.length === 0) {
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

        const studentExtras =
          tgtStudent.id === student.id ? extras : readStudentExtras(tgtStudent.id, activeForm?.id || activeFormId);

        return createReportStudent(tgtStudent, {
          reportDate,
          academicYear: detectedAcademicYear,
          semester: detectedSemester,
          sikapItems,
          perilakuItems,
          tarafBerpikir: studentExtras.tarafBerpikir,
          ketidakhadiran: studentExtras.ketidakhadiran,
          kesimpulan: studentExtras.kesimpulan,
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
              Nilai Sikap & Perilaku terhubung otomatis dari formulir penilaian yang dipilih
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ${
              assessmentStatus.hasTeacher ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Icon icon={assessmentStatus.hasTeacher ? 'solar:check-circle-bold' : 'solar:clock-circle-linear'} width={15} />
            Guru: {assessmentStatus.hasTeacher ? 'Terisi' : 'Belum'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold ${
              assessmentStatus.hasParent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Icon icon={assessmentStatus.hasParent ? 'solar:check-circle-bold' : 'solar:clock-circle-linear'} width={15} />
            Orang Tua: {assessmentStatus.hasParent ? 'Terisi' : 'Belum'}
          </span>
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <Icon icon="solar:users-group-rounded-linear" width={17} className="text-slate-500" />
            <span>
              Kelas {student.class || '-'} • {classmates.length} Siswa
            </span>
          </div>
        </div>
      </div>

      {/* Grid Pengaturan: Formulir Penilaian, Tanggal Rapor, Format File */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-form-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Formulir Penilaian (Sumber Nilai Sikap & Perilaku)
          </label>
          {forms.length > 0 ? (
            <select
              id="report-form-select"
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-date-input" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tanggal Rapor (Tanda Tangan)
          </label>
          <input
            id="report-date-input"
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            disabled={isExporting}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-1 focus:bg-white focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <label htmlFor="report-format-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Format Dokumen
          </label>
          <select
            id="report-format-select"
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

      {/* Pengisian Taraf Berpikir, Ketidakhadiran, dan Kesimpulan */}
      <div className="mt-5 space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
        {/* F. Taraf Berpikir */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            F. Taraf Berpikir
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {TARAF_BERPIKIR_OPTIONS.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-primary-1/50"
              >
                <input
                  type="checkbox"
                  checked={extras.tarafBerpikir[option.key]}
                  onChange={() => handleToggleTarafBerpikir(option.key)}
                  disabled={isExporting}
                  className="h-4 w-4 rounded border-slate-300 text-primary-1 focus:ring-primary-1"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* G. Ketidakhadiran */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            G. Ketidakhadiran
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {KETIDAKHADIRAN_OPTIONS.map((option) => (
              <div key={option.key} className="flex flex-col gap-1">
                <label htmlFor={`absen-${option.key}`} className="text-xs font-medium text-slate-600">
                  {option.label}
                </label>
                <input
                  id={`absen-${option.key}`}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Kosongkan jika tidak diisi"
                  value={extras.ketidakhadiran[option.key] ?? ''}
                  onChange={(event) => handleChangeKetidakhadiran(option.key, event.target.value)}
                  disabled={isExporting}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-1 focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>

        {/* H. Kesimpulan */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            H. Kesimpulan
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="kesimpulan-proses" className="text-xs font-medium text-slate-600">
                Proses
              </label>
              <input
                id="kesimpulan-proses"
                type="text"
                placeholder="Contoh: JAYYID JIDDAN"
                value={extras.kesimpulan.proses}
                onChange={(event) => handleChangeKesimpulan('proses', event.target.value)}
                disabled={isExporting}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-1 focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="kesimpulan-output" className="text-xs font-medium text-slate-600">
                Output
              </label>
              <input
                id="kesimpulan-output"
                type="text"
                placeholder="Contoh: JAYYID JIDDAN"
                value={extras.kesimpulan.output}
                onChange={(event) => handleChangeKesimpulan('output', event.target.value)}
                disabled={isExporting}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-1 focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="kesimpulan-catatan" className="text-xs font-medium text-slate-600">
                Catatan untuk diperhatikan orang tua/wali
              </label>
              <textarea
                id="kesimpulan-catatan"
                rows={2}
                placeholder="Tulis catatan untuk orang tua/wali..."
                value={extras.kesimpulan.catatan}
                onChange={(event) => handleChangeKesimpulan('catatan', event.target.value)}
                disabled={isExporting}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-1 focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="kesimpulan-kenaikan" className="text-xs font-medium text-slate-600">
                Keterangan kenaikan kelas
              </label>
              <input
                id="kesimpulan-kenaikan"
                type="text"
                placeholder="Contoh: Naik ke kelas II / Tetap di kelas..."
                value={extras.kesimpulan.kenaikanKelas}
                onChange={(event) => handleChangeKesimpulan('kenaikanKelas', event.target.value)}
                disabled={isExporting}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-1 focus:ring-2 focus:ring-primary-1/10 disabled:opacity-50"
              />
            </div>
          </div>
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
