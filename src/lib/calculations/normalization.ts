import { ASSESSMENT_MAX_POINT } from '/src/constants/assessment';

export const normalizationScoreToPercentage = (score: number): number => {
  const percentage = (score / ASSESSMENT_MAX_POINT) * 100;
  return Math.round(percentage * 100) / 100;
};
