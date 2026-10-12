export type NumericDraft = string;

export function numberOrUndefined(value: NumericDraft): number | undefined {
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function requiredNumber(value: NumericDraft): number {
  const parsed = numberOrUndefined(value);
  if (parsed === undefined) throw new Error('Une valeur numérique est requise');
  return parsed;
}
