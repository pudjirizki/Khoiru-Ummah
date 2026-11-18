import { StudentInterface } from '/src/interfaces/student';

export interface ReportMetric {
  label: string;
  type: 'grade' | 'text';
  group?: string;
}

export interface ReportValue {
  score: number | null;
  letter: string;
  text: string;
}

export interface ReportRow {
  label: string;
  kkm: number | null;
  values: ReportValue[];
}

export interface ReportTable {
  title: string;
  metrics: ReportMetric[];
  rows: ReportRow[];
  showKkm: boolean;
}

export interface ReportSection {
  title: string;
  tables: ReportTable[];
}

export interface ReportStudent {
  name: string;
  identityNumber: string;
  className: string;
  semester: string;
  academicYear: string;
  sections: ReportSection[];
}

export interface GradeScaleEntry {
  minimum: number;
  label: string;
}

export const DEFAULT_GRADE_SCALE: GradeScaleEntry[] = [
  { minimum: 95, label: 'A+' },
  { minimum: 85, label: 'A' },
  { minimum: 80, label: 'B+' },
  { minimum: 75, label: 'B' },
  { minimum: 70, label: 'C' },
  { minimum: 0, label: 'D' },
];

export const scoreToLetter = (score: number | null, scale: GradeScaleEntry[] = DEFAULT_GRADE_SCALE): string => {
  if (score === null || !Number.isFinite(score) || score < 0 || score > 100) return '-';

  const grade = [...scale].sort((a, b) => b.minimum - a.minimum).find((entry) => score >= entry.minimum);
  return grade?.label ?? '-';
};

const gradeMetrics = (labels: string[]): ReportMetric[] => labels.map((label) => ({ label, type: 'grade' }));

const createRows = (labels: string[], metricCount: number): ReportRow[] =>
  labels.map((label) => ({
    label,
    kkm: null,
    values: Array.from({ length: metricCount }, () => ({
      score: null,
      letter: scoreToLetter(null),
      text: '-',
    })),
  }));

const createTable = (title: string, labels: string[], metrics: ReportMetric[], showKkm = true): ReportTable => ({
  title,
  metrics,
  rows: createRows(labels, metrics.length),
  showKkm,
});

const reportSubjects = ['Matematika', 'Sains', 'Geografi', 'Bahasa Inggris', 'Olahraga/Senam'];
const subjectMetrics = gradeMetrics(['Pengetahuan', 'Pemahaman', 'Keahlian', 'Minat', 'Proses']);
const extracurricularNames = ['Berenang', 'Memanah', 'Beladiri', 'Berkarya', 'Memasak', 'Berkuda', 'Berkebun', 'PBB'];
const extracurricularMetrics = gradeMetrics(['Minat', 'Kesungguhan', 'Kreativitas/Inovasi']);

export const createReportStudent = (student: StudentInterface): ReportStudent => ({
  name: student.name || '-',
  identityNumber: student.identityNumber || '-',
  className: student.class || '-',
  semester: '-',
  academicYear: '-',
  sections: [
    {
      title: 'A. PENILAIAN MATA PELAJARAN',
      tables: [
        createTable(
          "Tahfizhul Qur'an",
          ["Tahfizhul Qur'an"],
          [
            { label: 'Setoran', type: 'text', group: 'Kuantitas' },
            { label: 'Mutqin', type: 'grade', group: 'Kuantitas' },
            ...gradeMetrics(['Kualitas', 'Kecepatan', 'Minat', 'Proses']),
          ]
        ),
        createTable(
          "Tahsinul Qur'an",
          ["Tahsinul Qur'an"],
          [
            { label: 'Capaian', type: 'text' },
            ...gradeMetrics(['Fashohah', 'Tartil', 'Minat', 'Proses']),
          ]
        ),
        createTable('Bahasa Arab & Bahasa Indonesia', ['Bahasa Arab', 'Bahasa Indonesia'], subjectMetrics),
      ],
    },
    {
      title: 'B. PENILAIAN MATA PELAJARAN INTI',
      tables: [createTable('Mapel Inti', ['Tsaqafah Islam (PAI)', 'Adab'], subjectMetrics)],
    },
    {
      title: 'C. MAPEL PENUNJANG',
      tables: [createTable('Mapel Penunjang', reportSubjects, subjectMetrics)],
    },
    {
      title: 'D. EKSTRAKURIKULER',
      tables: [createTable('Kegiatan Ekstrakurikuler', extracurricularNames, extracurricularMetrics, false)],
    },
    {
      title: 'E. SIKAP',
      tables: [createTable('Penilaian Sikap', Array.from({ length: 11 }, (_, index) => `Butir sikap ${index + 1}`), gradeMetrics(['Penilaian']), false)],
    },
    {
      title: 'E. PERILAKU / AL BIAH KU',
      tables: [
        createTable(
          'Perilaku / Al Biah KU',
          [
            "Al Qur'an Bacaan dan Amalan KU",
            'Bersih Diri dan Lingkungan KU',
            'Ibadah Sepanjang Hayat KU',
            'Ahsan Tutur Kata dan Perbuatan KU',
            'Halalan Thayyiban Makanan dan Minuman KU',
          ],
          gradeMetrics(['Penilaian']),
          false
        ),
      ],
    },
    {
      title: 'F. TARAF BERPIKIR',
      tables: [createTable('Taraf Berpikir', ['Pola Pikir', 'Berpikir Benar', 'Berpikir Solutif', 'Berpikir Cepat'], gradeMetrics(['Penilaian']), false)],
    },
    {
      title: 'G. KETIDAKHADIRAN',
      tables: [
        {
          title: 'Ketidakhadiran',
          metrics: [{ label: 'Jumlah hari', type: 'text' }],
          rows: createRows(['Sakit', 'Izin', 'Tanpa keterangan'], 1),
          showKkm: false,
        },
      ],
    },
    {
      title: 'H. KESIMPULAN',
      tables: [
        {
          title: 'Kesimpulan',
          metrics: [{ label: 'Keterangan', type: 'text' }],
          rows: createRows(['Proses', 'Output', 'Catatan untuk diperhatikan orang tua/wali', 'Keterangan kenaikan kelas'], 1),
          showKkm: false,
        },
      ],
    },
  ],
});

export const sanitizeFileName = (value: string): string => {
  const withoutControlCharacters = Array.from(value)
    .filter((character) => {
      const codePoint = character.charCodeAt(0);
      return codePoint >= 32 && codePoint !== 127;
    })
    .join('');

  return withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '') || '-';
};

export const createReportFileName = (student: ReportStudent): string =>
  `Rapor_${sanitizeFileName(student.name)}_${sanitizeFileName(student.className)}_${sanitizeFileName(student.semester)}_${sanitizeFileName(student.academicYear)}`;

export const createClassReportFileName = (className: string): string =>
  `Rapor_Kelas_${sanitizeFileName(className)}_-_-`;
