export type MasterySource = {
  globalMastery?: number;
  mastery?: number | Record<string, number>;
  subjectProgress?: Record<string, number>;
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const normalizeValue = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  if (value <= 1.5) return clamp(value);
  if (value <= 10) return clamp(value / 10);
  if (value <= 100) return clamp(value / 100);
  return clamp(value / 100);
};

export const resolveMasteryRatio = (source?: MasterySource | null): number => {
  if (!source) return 0;

  const masteryMap = source.mastery && typeof source.mastery === 'object'
    ? source.mastery
    : undefined;
  const subjectMap = source.subjectProgress;

  const extractValues = (map?: Record<string, number>) => (map
    ? Object.values(map).filter(
      (value): value is number => typeof value === 'number' && Number.isFinite(value)
    )
    : []);

  const subjectValues = extractValues(subjectMap);
  const masteryValues = extractValues(masteryMap);
  const values = subjectValues.length ? subjectValues : masteryValues;

  if (values.length) {
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const max = Math.max(...values);

    if (max <= 1.5) return clamp(average);
    if (max <= 10) return clamp(average / 10);
    if (max <= 100) return clamp(average / 100);
    return normalizeValue(average);
  }

  if (typeof source.globalMastery === 'number' && Number.isFinite(source.globalMastery) && source.globalMastery > 0) {
    return clamp(source.globalMastery);
  }
  if (typeof source.mastery === 'number') {
    return normalizeValue(source.mastery);
  }

  return 0;
};

export const resolveMasteryPercent = (source?: MasterySource | null): number => {
  return Math.round(resolveMasteryRatio(source) * 100);
};
