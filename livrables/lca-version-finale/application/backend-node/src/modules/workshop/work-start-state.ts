export interface WorkStartEvidence{
  startedSessionCount:unknown;
}

export const WORK_STARTED_COUNT_SQL='SELECT COUNT(*) started_session_count FROM work_sessions WHERE repair_order_id=? AND started_at IS NOT NULL';

export const workStartedFromEvidence=(evidence:WorkStartEvidence)=>Number(evidence.startedSessionCount)>0;
