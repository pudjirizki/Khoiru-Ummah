import { StudentInterface } from '/src/interfaces/student';
import { FinalFormInterface } from '/src/interfaces/final-form';
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
import { UserInterface } from '/src/interfaces/user';
import { buildCriteriaHistory, CriteriaHistoryEntry } from '/src/lib/calculations/criteria-history';
import { normalizationScoreToPercentage } from '/src/lib/calculations/normalization';

export interface GradeScaleEntry {
  minimum: number;
  label: string;
}

export const DEFAULT_GRADE_SCALE: GradeScaleEntry[] = [
  { minimum: 96, label: 'A+' },
  { minimum: 86, label: 'A' },
  { minimum: 81, label: 'B+' },
  { minimum: 75, label: 'B' },
  { minimum: 70, label: 'C' },
  { minimum: 0, label: 'D' },
];

export const scoreToLetter = (score: number | null, scale: GradeScaleEntry[] = DEFAULT_GRADE_SCALE): string => {
  if (score === null || !Number.isFinite(score) || score < 0 || score > 100) return '-';

  const grade = [...scale].sort((a, b) => b.minimum - a.minimum).find((entry) => score >= entry.minimum);
  return grade?.label ?? '-';
};

export interface ReportItem {
  no: number;
  label: string;
  score: number | null;
  letter: string;
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

export interface ReportMetric {
  label: string;
  type: 'grade' | 'text';
  group?: string;
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

export interface GradePair {
  score: number | null;
  letter: string;
}

export interface TahfizhReportRow {
  no: number;
  subject: string;
  kkm: number;
  setoran: string;
  mutqin: string;
  kualitas: GradePair;
  kecepatan: GradePair;
  minat: GradePair;
  proses: GradePair;
}

export interface TahsinReportRow {
  no: number;
  subject: string;
  kkm: number;
  capaian: string;
  fashohah: GradePair;
  tartil: GradePair;
  minat: GradePair;
  proses: GradePair;
}

export interface AcademicSubjectReportRow {
  no: number;
  subject: string;
  kkm: number;
  pengetahuan: GradePair;
  pemahaman: GradePair;
  keahlian: GradePair;
  minat: GradePair;
  proses: GradePair;
}

export interface ExtracurricularReportRow {
  no: number;
  subject: string;
  kkm: number;
  minat: GradePair;
  kesungguhan: GradePair;
  kreativitas: GradePair;
}

export interface TarafBerpikirReport {
  polaPikir: boolean;
  berpikirBenar: boolean;
  berpikirSolutif: boolean;
  berpikirCepat: boolean;
}

export interface KetidakhadiranReport {
  sakit: number | null;
  izin: number | null;
  tanpaKeterangan: number | null;
}

export interface KesimpulanReport {
  proses: string;
  output: string;
  catatan: string;
  kenaikanKelas: string;
}

export interface ReportStudent {
  name: string;
  identityNumber: string;
  className: string;
  semester: string;
  academicYear: string;
  title: string;
  dateAndPlace: string;
  tahfizhRows: TahfizhReportRow[];
  tahsinRows: TahsinReportRow[];
  mapelUmumRows: AcademicSubjectReportRow[];
  mapelIntiRows: AcademicSubjectReportRow[];
  mapelPenunjangRows: AcademicSubjectReportRow[];
  ekstrakurikulerRows: ExtracurricularReportRow[];
  sikapItems: ReportItem[];
  perilakuItems: ReportItem[];
  tarafBerpikir: TarafBerpikirReport;
  ketidakhadiran: KetidakhadiranReport;
  kesimpulan: KesimpulanReport;
  sections: ReportSection[];
}

const emptyGradePair = (): GradePair => ({ score: null, letter: '' });

const createDefaultAcademicRow = (no: number, subject: string, kkm = 71): AcademicSubjectReportRow => ({
  no,
  subject,
  kkm,
  pengetahuan: emptyGradePair(),
  pemahaman: emptyGradePair(),
  keahlian: emptyGradePair(),
  minat: emptyGradePair(),
  proses: emptyGradePair(),
});

const createDefaultEkskulRow = (no: number, subject: string, kkm = 71): ExtracurricularReportRow => ({
  no,
  subject,
  kkm,
  minat: emptyGradePair(),
  kesungguhan: emptyGradePair(),
  kreativitas: emptyGradePair(),
});

export const DEFAULT_TAHFIZH_ROWS: TahfizhReportRow[] = [
  {
    no: 1,
    subject: 'Tahfizhul Qur’an',
    kkm: 71,
    setoran: '',
    mutqin: '',
    kualitas: emptyGradePair(),
    kecepatan: emptyGradePair(),
    minat: emptyGradePair(),
    proses: emptyGradePair(),
  },
];

export const DEFAULT_TAHSIN_ROWS: TahsinReportRow[] = [
  {
    no: 2,
    subject: 'Tahsinul Qur’an',
    kkm: 71,
    capaian: '',
    fashohah: emptyGradePair(),
    tartil: emptyGradePair(),
    minat: emptyGradePair(),
    proses: emptyGradePair(),
  },
];

export const DEFAULT_MAPEL_UMUM_ROWS: AcademicSubjectReportRow[] = [
  createDefaultAcademicRow(1, 'Bahasa Arab'),
  createDefaultAcademicRow(2, 'Bahasa Indonesia'),
];

export const DEFAULT_MAPEL_INTI_ROWS: AcademicSubjectReportRow[] = [
  createDefaultAcademicRow(1, 'Tsaqafah Islam (PAI)'),
  createDefaultAcademicRow(2, 'Adab'),
];

export const DEFAULT_MAPEL_PENUNJANG_ROWS: AcademicSubjectReportRow[] = [
  createDefaultAcademicRow(1, 'Matematika'),
  createDefaultAcademicRow(2, 'Sains (IPA)'),
  createDefaultAcademicRow(3, 'Geografi (IPS-PKn)'),
  createDefaultAcademicRow(4, 'B.Inggris'),
  createDefaultAcademicRow(5, 'Olahraga/Senam'),
];

export const DEFAULT_EKSTRAKURIKULER_ROWS: ExtracurricularReportRow[] = [
  createDefaultEkskulRow(1, 'Berenang'),
  createDefaultEkskulRow(2, 'Memanah'),
  createDefaultEkskulRow(3, 'Beladiri'),
  createDefaultEkskulRow(4, 'Berkarya'),
  createDefaultEkskulRow(5, 'Memasak'),
  createDefaultEkskulRow(6, 'Berkuda'),
  createDefaultEkskulRow(7, 'Berkebun'),
  createDefaultEkskulRow(8, 'PBB'),
];

export const DEFAULT_TARAF_BERPIKIR: TarafBerpikirReport = {
  polaPikir: false,
  berpikirBenar: false,
  berpikirSolutif: false,
  berpikirCepat: false,
};

export const DEFAULT_KETIDAKHADIRAN: KetidakhadiranReport = {
  sakit: null,
  izin: null,
  tanpaKeterangan: null,
};

export const DEFAULT_KESIMPULAN: KesimpulanReport = {
  proses: '',
  output: '',
  catatan: '',
  kenaikanKelas: '',
};

export const DEFAULT_SIKAP_ITEMS: ReportItem[] = [
  { no: 1, label: 'Ketaatan kepada Allah dan Rasul-Nya', score: 85, letter: 'B+' },
  { no: 2, label: 'Ketaatan kepada orang tua', score: 95, letter: 'A' },
  { no: 3, label: 'Ketaatan guru', score: 95, letter: 'A' },
  { no: 4, label: 'Percaya diri', score: 96, letter: 'A' },
  { no: 5, label: 'Kemandirian', score: 85, letter: 'B+' },
  { no: 6, label: 'Kedisiplinan', score: 87, letter: 'A' },
  { no: 7, label: 'Kejujuran', score: 85, letter: 'B+' },
  { no: 8, label: 'Kesungguhan', score: 85, letter: 'B+' },
  { no: 9, label: 'Amanah', score: 85, letter: 'B+' },
  { no: 10, label: 'Fastabiqul khairaat', score: 82, letter: 'B+' },
  { no: 11, label: 'Kesopanan', score: 93, letter: 'A' },
];

export const DEFAULT_PERILAKU_ITEMS: ReportItem[] = [
  { no: 1, label: "Al Qur'an Bacaan dan Amalan KU", score: 87, letter: 'A' },
  { no: 2, label: 'Bersih Diri dan Lingkungan KU', score: 86, letter: 'A' },
  { no: 3, label: 'Ibadah Sepanjang Hayat KU', score: 82, letter: 'B+' },
  { no: 4, label: 'Ahsan Tutur Kata dan Perbuatan KU', score: 86, letter: 'A' },
  { no: 5, label: 'Halalan Thayyiban Makanan dan Minuman KU', score: 86, letter: 'A' },
];

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const formatReportDate = (dateInput?: Date | string | null, city = 'Kota Bogor'): string => {
  let date: Date;

  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateInput);
  }

  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }

  const day = date.getDate();
  const month = MONTH_NAMES_ID[date.getMonth()];
  const year = date.getFullYear();

  return `${city}, ${day} ${month} ${year}`;
};

const cleanString = (val: string): string =>
  val
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SIKAP_SYNONYMS: Record<number, string[]> = {
  1: ['ketaatan kepada allah', 'allah dan rasul', 'allah', 'rasul', 'syariat'],
  2: ['ketaatan kepada orang tua', 'taat orang tua', 'orang tua', 'ayah', 'ibu'],
  3: ['ketaatan guru', 'hormat kepada guru', 'hormat guru', 'taat guru', 'ustadz', 'ustadzah'],
  4: ['percaya diri', 'percaya'],
  5: ['kemandirian', 'mandiri'],
  6: ['kedisiplinan', 'disiplin'],
  7: ['kejujuran', 'jujur'],
  8: ['kesungguhan', 'sungguh'],
  9: ['amanah', 'tanggung jawab'],
  10: ['fastabiqul khairaat', 'fastabiqul', 'khairaat', 'khairat'],
  11: ['kesopanan', 'sopan', 'santun'],
};

const PERILAKU_SYNONYMS: Record<number, string[]> = {
  1: [
    'al quran bacaan dan amalan',
    'bacaan dan amalan',
    'qiroatul quran',
    'birrul walidain',
    'berpakaian sesuai al quran',
    'quran',
    'bacaan',
    'amalan',
  ],
  2: ['bersih diri dan lingkungan', 'bersih diri', 'kebersihan', 'kerapihan', 'berpakaian', 'lingkungan'],
  3: ['ibadah sepanjang hayat', 'sepanjang hayat', 'beribadah', 'ibadah'],
  4: [
    'ahsan tutur kata dan perbuatan',
    'tutur kata dan perbuatan',
    'berbicara ahsan',
    'berbuat baik',
    'kerjasama',
    'amar maruf',
    'kepemimpinan',
    'ahsan',
    'tutur kata',
  ],
  5: ['halalan thayyiban makanan dan minuman', 'halalan thayyiban', 'pola makan dan minum', 'pola makan', 'halalan', 'thayyiban', 'makanan'],
};

interface ScoredCandidate {
  label: string;
  score: number | null;
  criteriaTitle: string;
  criteriaDesc: string;
  isCriteria: boolean;
  order?: number;
}

const toPercentageScore = (rawScore: number | null | undefined): number | null => {
  if (rawScore === null || rawScore === undefined || !Number.isFinite(rawScore)) return null;
  // Scores <= 4 come from the 1..4 assessment point scale; values > 4 are already 0..100 percentages
  const score100 = rawScore <= 4 ? Math.round(normalizationScoreToPercentage(rawScore)) : Math.round(rawScore);
  return Math.max(0, Math.min(100, score100));
};

export const extractScoresFromAssessment = (
  studentId: string,
  form?: FinalFormInterface,
  assessments?: FinalAssessmentInterface[],
  users?: UserInterface[]
): { sikapItems: ReportItem[]; perilakuItems: ReportItem[] } => {
  if (!form) {
    return {
      sikapItems: DEFAULT_SIKAP_ITEMS.map((item) => ({ ...item, score: null, letter: '-' })),
      perilakuItems: DEFAULT_PERILAKU_ITEMS.map((item) => ({ ...item, score: null, letter: '-' })),
    };
  }

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const studentFormAssessments = (assessments ?? []).filter(
    (a) => (a.studenId === studentId || (a as any).studentId === studentId) && a.formId === form.id
  );

  if (studentFormAssessments.length === 0) {
    return {
      sikapItems: DEFAULT_SIKAP_ITEMS.map((item) => ({ ...item, score: null, letter: '-' })),
      perilakuItems: DEFAULT_PERILAKU_ITEMS.map((item) => ({ ...item, score: null, letter: '-' })),
    };
  }

  const parentAssessment = studentFormAssessments.find((a) => userMap.get(a.userId)?.role === 'parent');
  const teacherAssessment =
    studentFormAssessments.find((a) => {
      const role = userMap.get(a.userId)?.role;
      return role === 'teacher' || role === 'admin';
    }) ?? studentFormAssessments.find((a) => a.id !== parentAssessment?.id);

  const criteriaEntries: CriteriaHistoryEntry[] = buildCriteriaHistory(form, teacherAssessment, parentAssessment);

  const criteriaCandidates: ScoredCandidate[] = [];
  const questionCandidates: ScoredCandidate[] = [];

  criteriaEntries.forEach((entry, cIdx) => {
    criteriaCandidates.push({
      label: entry.description || entry.title,
      score: entry.finalScore,
      criteriaTitle: entry.title,
      criteriaDesc: entry.description,
      isCriteria: true,
      order: cIdx + 1,
    });

    entry.questions.forEach((q, qIdx) => {
      questionCandidates.push({
        label: q.title,
        score: q.finalScore,
        criteriaTitle: entry.title,
        criteriaDesc: entry.description,
        isCriteria: false,
        order: qIdx + 1,
      });
    });
  });

  const sikapGroup = criteriaEntries.find(
    (c) =>
      (cleanString(c.title).includes('sikap') || cleanString(c.description).includes('sikap')) &&
      c.questions.length >= DEFAULT_SIKAP_ITEMS.length
  );
  const perilakuGroup = criteriaEntries.find(
    (c) =>
      (cleanString(c.title).includes('perilaku') ||
        cleanString(c.title).includes('biah') ||
        cleanString(c.description).includes('perilaku') ||
        cleanString(c.description).includes('biah')) &&
      c.questions.length >= DEFAULT_PERILAKU_ITEMS.length
  );

  const resolveFromPool = (
    pool: ScoredCandidate[],
    itemNo: number,
    targetLabel: string,
    synonymsMap?: Record<number, string[]>
  ): number | null => {
    const targetClean = cleanString(targetLabel);

    // Exact or substring match
    const exactOrSub = pool.filter((cand) => {
      const candClean = cleanString(cand.label);
      return (
        cand.score !== null &&
        cand.score !== undefined &&
        (candClean === targetClean || candClean.includes(targetClean) || targetClean.includes(candClean))
      );
    });
    if (exactOrSub.length > 0) {
      const scores = exactOrSub.map((c) => toPercentageScore(c.score)).filter((s): s is number => s !== null);
      if (scores.length > 0) return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    // Synonym / keyword match (collect all matching sub-criterias if multiple template criterias map to one item)
    const synonyms = synonymsMap?.[itemNo] ?? [];
    for (const syn of synonyms) {
      const synClean = cleanString(syn);
      const matched = pool.filter(
        (cand) => cand.score !== null && cand.score !== undefined && cleanString(cand.label).includes(synClean)
      );
      if (matched.length > 0) {
        const scores = matched.map((c) => toPercentageScore(c.score)).filter((s): s is number => s !== null);
        if (scores.length > 0) return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
    }

    return null;
  };

  const resolveItemScore = (
    itemNo: number,
    targetLabel: string,
    index: number,
    groupEntry?: CriteriaHistoryEntry,
    groupOffset = 0,
    synonymsMap?: Record<number, string[]>
  ): { score: number | null; letter: string } => {
    // 1. Group-level question match (when form uses 2 parent criterias: Sikap & Perilaku)
    if (groupEntry) {
      const groupQuestions: ScoredCandidate[] = groupEntry.questions.map((q, qIdx) => ({
        label: q.title,
        score: q.finalScore,
        criteriaTitle: groupEntry.title,
        criteriaDesc: groupEntry.description,
        isCriteria: false,
        order: qIdx + 1,
      }));
      const matchedInGroup = resolveFromPool(groupQuestions, itemNo, targetLabel, synonymsMap);
      if (matchedInGroup !== null) {
        return { score: matchedInGroup, letter: scoreToLetter(matchedInGroup) };
      }
      if (groupEntry.questions.length > index) {
        const score100 = toPercentageScore(groupEntry.questions[index]?.finalScore);
        if (score100 !== null) {
          return { score: score100, letter: scoreToLetter(score100) };
        }
      }
    }

    // 2. Criteria-level label or synonym match (when each aspek Sikap/Perilaku is a Criteria)
    const matchedCriteriaScore = resolveFromPool(criteriaCandidates, itemNo, targetLabel, synonymsMap);
    if (matchedCriteriaScore !== null) {
      return { score: matchedCriteriaScore, letter: scoreToLetter(matchedCriteriaScore) };
    }

    // 3. Question-level label or synonym match across form
    const matchedQuestionScore = resolveFromPool(questionCandidates, itemNo, targetLabel, synonymsMap);
    if (matchedQuestionScore !== null) {
      return { score: matchedQuestionScore, letter: scoreToLetter(matchedQuestionScore) };
    }

    // 4. Fallback: match by criteria entry order if total criteria count matches 16 (11 sikap + 5 perilaku)
    const totalIndex = groupOffset + index;
    if (criteriaEntries.length >= 16 && criteriaEntries.length > totalIndex) {
      const score100 = toPercentageScore(criteriaEntries[totalIndex]?.finalScore);
      if (score100 !== null) {
        return { score: score100, letter: scoreToLetter(score100) };
      }
    }

    return { score: null, letter: '-' };
  };

  const sikapItems: ReportItem[] = DEFAULT_SIKAP_ITEMS.map((item, idx) => {
    const res = resolveItemScore(item.no, item.label, idx, sikapGroup, 0, SIKAP_SYNONYMS);
    return {
      no: item.no,
      label: item.label,
      score: res.score,
      letter: res.letter,
    };
  });

  const perilakuItems: ReportItem[] = DEFAULT_PERILAKU_ITEMS.map((item, idx) => {
    const res = resolveItemScore(item.no, item.label, idx, perilakuGroup, 11, PERILAKU_SYNONYMS);
    return {
      no: item.no,
      label: item.label,
      score: res.score,
      letter: res.letter,
    };
  });

  return { sikapItems, perilakuItems };
};

const itemsToRows = (items: ReportItem[]): ReportRow[] =>
  items.map((item) => ({
    label: item.label,
    kkm: null,
    values: [
      {
        score: item.score,
        letter: item.letter || scoreToLetter(item.score),
        text: '-',
      },
    ],
  }));

export interface CreateReportOptions {
  reportDate?: string | Date;
  city?: string;
  academicYear?: string;
  semester?: string;
  tahfizhRows?: TahfizhReportRow[];
  tahsinRows?: TahsinReportRow[];
  mapelUmumRows?: AcademicSubjectReportRow[];
  mapelIntiRows?: AcademicSubjectReportRow[];
  mapelPenunjangRows?: AcademicSubjectReportRow[];
  ekstrakurikulerRows?: ExtracurricularReportRow[];
  sikapItems?: ReportItem[];
  perilakuItems?: ReportItem[];
  tarafBerpikir?: Partial<TarafBerpikirReport>;
  ketidakhadiran?: Partial<KetidakhadiranReport>;
  kesimpulan?: Partial<KesimpulanReport>;
}

export const createReportStudent = (
  student: StudentInterface,
  options?: CreateReportOptions
): ReportStudent => {
  const rawClass = student.class || 'I';
  const semester = options?.semester || (rawClass.includes('/') ? rawClass.split('/')[1] : 'I');
  const className = rawClass.includes('/') ? rawClass.split('/')[0] : rawClass;

  const resolvedSikapItems = options?.sikapItems ?? DEFAULT_SIKAP_ITEMS;
  const resolvedPerilakuItems = options?.perilakuItems ?? DEFAULT_PERILAKU_ITEMS;

  const sikapRows = itemsToRows(resolvedSikapItems);
  const perilakuRows = itemsToRows(resolvedPerilakuItems);

  const sikapTable: ReportTable = {
    title: 'Sikap',
    metrics: [{ label: 'Penilaian', type: 'grade' }],
    rows: sikapRows,
    showKkm: false,
  };

  const perilakuTable: ReportTable = {
    title: 'Perilaku / AL BIAH KU',
    metrics: [{ label: 'Penilaian', type: 'grade' }],
    rows: perilakuRows,
    showKkm: false,
  };

  return {
    name: student.name || '-',
    identityNumber: student.identityNumber || '-',
    className,
    semester,
    academicYear: options?.academicYear || '2026/2027',
    title: 'LAPORAN HASIL BELAJAR SISWA',
    dateAndPlace: formatReportDate(options?.reportDate, options?.city ?? 'Kota Bogor'),
    tahfizhRows: options?.tahfizhRows ?? DEFAULT_TAHFIZH_ROWS,
    tahsinRows: options?.tahsinRows ?? DEFAULT_TAHSIN_ROWS,
    mapelUmumRows: options?.mapelUmumRows ?? DEFAULT_MAPEL_UMUM_ROWS,
    mapelIntiRows: options?.mapelIntiRows ?? DEFAULT_MAPEL_INTI_ROWS,
    mapelPenunjangRows: options?.mapelPenunjangRows ?? DEFAULT_MAPEL_PENUNJANG_ROWS,
    ekstrakurikulerRows: options?.ekstrakurikulerRows ?? DEFAULT_EKSTRAKURIKULER_ROWS,
    sikapItems: resolvedSikapItems,
    perilakuItems: resolvedPerilakuItems,
    tarafBerpikir: { ...DEFAULT_TARAF_BERPIKIR, ...options?.tarafBerpikir },
    ketidakhadiran: { ...DEFAULT_KETIDAKHADIRAN, ...options?.ketidakhadiran },
    kesimpulan: { ...DEFAULT_KESIMPULAN, ...options?.kesimpulan },
    sections: [
      {
        title: 'SIKAP DAN PERILAKU SISWA',
        tables: [sikapTable, perilakuTable],
      },
    ],
  };
};

export const sanitizeFileName = (value: string): string => {
  const withoutControlCharacters = Array.from(value)
    .filter((character) => {
      const codePoint = character.charCodeAt(0);
      return codePoint >= 32 && codePoint !== 127;
    })
    .join('');

  return (
    withoutControlCharacters
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[-_.]+|[-_.]+$/g, '') || '-'
  );
};

export const createReportFileName = (student: ReportStudent): string =>
  `Rapor_Sikap_Perilaku_${sanitizeFileName(student.name)}_${sanitizeFileName(student.className)}`;

export const createClassReportFileName = (className: string): string =>
  `Rapor_Sikap_Perilaku_Kelas_${sanitizeFileName(className)}`;
