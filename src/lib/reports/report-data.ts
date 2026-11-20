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
  { minimum: 86, label: 'A' },
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

export interface ReportStudent {
  name: string;
  identityNumber: string;
  className: string;
  semester: string;
  academicYear: string;
  title: string;
  dateAndPlace: string;
  sikapItems: ReportItem[];
  perilakuItems: ReportItem[];
  sections: ReportSection[];
}

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
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const SIKAP_SYNONYMS: Record<number, string[]> = {
  1: ['allah', 'rasul', 'ketaatan kepada allah', 'ibadah', 'syariat'],
  2: ['orang tua', 'ayah', 'ibu', 'birrul walidain', 'taat orang tua'],
  3: ['guru', 'ustadz', 'ustadzah', 'ketaatan guru'],
  4: ['percaya diri', 'percaya'],
  5: ['mandiri', 'kemandirian'],
  6: ['disiplin', 'kedisiplinan'],
  7: ['jujur', 'kejujuran'],
  8: ['sungguh', 'kesungguhan'],
  9: ['amanah', 'tanggung jawab'],
  10: ['fastabiqul', 'khairaat', 'khairat', 'berlomba'],
  11: ['sopan', 'kesopanan', 'adab', 'santun'],
};

const PERILAKU_SYNONYMS: Record<number, string[]> = {
  1: ['quran', 'qur an', 'bacaan', 'amalan'],
  2: ['bersih', 'lingkungan', 'kebersihan'],
  3: ['sepanjang hayat', 'hayat', 'sholat', 'salat', 'ibadah sepanjang hayat'],
  4: ['ahsan', 'tutur kata', 'tutur', 'perkataan', 'perbuatan'],
  5: ['halalan', 'thayyiban', 'thayib', 'makanan', 'minuman'],
};

interface ScoredCandidate {
  label: string;
  score: number | null;
  criteriaTitle: string;
  criteriaDesc: string;
  order?: number;
}

export const extractScoresFromAssessment = (
  studentId: string,
  form?: FinalFormInterface,
  assessments?: FinalAssessmentInterface[],
  users?: UserInterface[]
): { sikapItems: ReportItem[]; perilakuItems: ReportItem[] } => {
  if (!form) {
    return {
      sikapItems: DEFAULT_SIKAP_ITEMS,
      perilakuItems: DEFAULT_PERILAKU_ITEMS,
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

  const teacherAssessment = studentFormAssessments.find((a) => userMap.get(a.userId)?.role === 'teacher');
  const parentAssessment = studentFormAssessments.find((a) => userMap.get(a.userId)?.role === 'parent');

  const criteriaEntries: CriteriaHistoryEntry[] = buildCriteriaHistory(form, teacherAssessment, parentAssessment);

  const candidates: ScoredCandidate[] = [];

  criteriaEntries.forEach((entry, cIdx) => {
    candidates.push({
      label: entry.description || entry.title,
      score: entry.finalScore,
      criteriaTitle: entry.title,
      criteriaDesc: entry.description,
      order: cIdx + 1,
    });

    entry.questions.forEach((q, qIdx) => {
      candidates.push({
        label: q.title,
        score: q.finalScore,
        criteriaTitle: entry.title,
        criteriaDesc: entry.description,
        order: qIdx + 1,
      });
    });
  });

  const sikapGroup = criteriaEntries.find(
    (c) => cleanString(c.title).includes('sikap') || cleanString(c.description).includes('sikap')
  );
  const perilakuGroup = criteriaEntries.find(
    (c) =>
      cleanString(c.title).includes('perilaku') ||
      cleanString(c.title).includes('biah') ||
      cleanString(c.description).includes('perilaku') ||
      cleanString(c.description).includes('biah')
  );

  const resolveItemScore = (
    itemNo: number,
    targetLabel: string,
    index: number,
    groupEntry?: CriteriaHistoryEntry,
    groupOffset = 0,
    synonymsMap?: Record<number, string[]>
  ): { score: number | null; letter: string } => {
    const targetClean = cleanString(targetLabel);

    // 1. Group-level question position match
    if (groupEntry && groupEntry.questions.length > index) {
      const q = groupEntry.questions[index];
      if (q && q.finalScore !== null && q.finalScore !== undefined) {
        const score100 = Math.round(normalizationScoreToPercentage(q.finalScore));
        return { score: score100, letter: scoreToLetter(score100) };
      }
    }

    // 2. Exact or substring match in any candidate
    for (const cand of candidates) {
      const candClean = cleanString(cand.label);
      if (candClean === targetClean || candClean.includes(targetClean) || targetClean.includes(candClean)) {
        if (cand.score !== null && cand.score !== undefined) {
          const score100 = Math.round(normalizationScoreToPercentage(cand.score));
          return { score: score100, letter: scoreToLetter(score100) };
        }
      }
    }

    // 3. Synonym / Keyword search
    const synonyms = synonymsMap?.[itemNo] ?? [];
    for (const syn of synonyms) {
      const synClean = cleanString(syn);
      const matched = candidates.find((cand) => cleanString(cand.label).includes(synClean));
      if (matched && matched.score !== null && matched.score !== undefined) {
        const score100 = Math.round(normalizationScoreToPercentage(matched.score));
        return { score: score100, letter: scoreToLetter(score100) };
      }
    }

    // 4. Fallback: match by criteria entry order if total criteria count matches
    const totalIndex = groupOffset + index;
    if (criteriaEntries.length > totalIndex) {
      const entry = criteriaEntries[totalIndex];
      if (entry && entry.finalScore !== null && entry.finalScore !== undefined) {
        const score100 = Math.round(normalizationScoreToPercentage(entry.finalScore));
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
  sikapItems?: ReportItem[];
  perilakuItems?: ReportItem[];
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
    title: 'SIKAP DAN PERILAKU SISWA',
    dateAndPlace: formatReportDate(options?.reportDate, options?.city ?? 'Kota Bogor'),
    sikapItems: resolvedSikapItems,
    perilakuItems: resolvedPerilakuItems,
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
