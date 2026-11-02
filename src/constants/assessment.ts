export const ASSESSMENT_POINT_LIST = [
  { label: 'D. Kurang Baik', value: 1 },
  { label: 'C. Cukup', value: 2 },
  { label: 'B. Baik', value: 3 },
  { label: 'A. Sangat Baik', value: 4 },
] as const;

export const ASSESSMENT_MAX_POINT = 4;

export const ASSESSMENT_ROLE_WEIGHT = {
  teacher: 0.6,
  parent: 0.4,
};
