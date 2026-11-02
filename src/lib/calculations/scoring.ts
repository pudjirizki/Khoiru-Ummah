import { ASSESSMENT_ROLE_WEIGHT } from '/src/constants/assessment';

export const calculateAveragePoint = (points: number[], digits = 2): number => {
  if (!Array.isArray(points) || points.length === 0) return 0;

  const valid = points.filter(Number.isFinite);
  if (valid.length === 0) return 0;

  const sum = valid.reduce((s, p) => s + p, 0);
  const avg = sum / valid.length;

  return typeof digits === 'number' ? Number(avg.toFixed(digits)) : avg;
};

export const calculateAssessmentScore = (groups: { points: number[]; weight: number }[]): number => {
  if (!groups.length) return 0;
  const weighted = groups
    .map((g) => {
      const avg = g.points.length ? g.points.reduce((s, p) => s + p, 0) / g.points.length : 0;
      return avg * g.weight;
    })
    .reduce((s, v) => s + v, 0);

  return weighted;
};

export const calculateFinalScore = (teacherScore: number, parentScore: number): number => {
  return teacherScore * ASSESSMENT_ROLE_WEIGHT.teacher + parentScore * ASSESSMENT_ROLE_WEIGHT.parent;
};
