export const CRM_COMMERCIAL_PROGRESS = {
  new: 0,
  contacted: 10,
  qualified: 25,
  appointment: 40,
  test_drive: 55,
  offer: 70,
  negotiation: 85,
  won: 100,
} as const;

export type CommercialProgressState = 'ACTIVE' | 'WON' | 'LOST' | 'UNAVAILABLE';

export function commercialProgressForStage(stage: unknown): {commercialProgress: number | null; commercialProgressState: CommercialProgressState} {
  if (stage === 'lost') return {commercialProgress: null, commercialProgressState: 'LOST'};
  if (stage === 'won') return {commercialProgress: CRM_COMMERCIAL_PROGRESS.won, commercialProgressState: 'WON'};
  if (typeof stage === 'string' && Object.hasOwn(CRM_COMMERCIAL_PROGRESS, stage)) {
    return {commercialProgress: CRM_COMMERCIAL_PROGRESS[stage as keyof typeof CRM_COMMERCIAL_PROGRESS], commercialProgressState: 'ACTIVE'};
  }
  return {commercialProgress: null, commercialProgressState: 'UNAVAILABLE'};
}
