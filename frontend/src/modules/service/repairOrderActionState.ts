export interface RepairActionSource {
  inspection?: unknown;
  diagnostics?: unknown[];
  approvals?: unknown[];
  qualityControls?: Array<{controlledAt:string}>;
  history?: Array<{newStatus:string;changedAt:string}>;
  invoice?: unknown;
  handover?: unknown;
}

export const repairActionCompletion=(repairOrder:RepairActionSource)=>{
  const qualityEntries=repairOrder.history?.filter(item=>item.newStatus==='quality_control').length??0;
  const qualityControls=repairOrder.qualityControls?.length??0;
  return {
    reception:Boolean(repairOrder.inspection),
    diagnostic:Boolean(repairOrder.diagnostics?.length),
    approval:Boolean(repairOrder.approvals?.length),
    quality:qualityControls>=Math.max(1,qualityEntries),
    invoice:Boolean(repairOrder.invoice),
    handover:Boolean(repairOrder.handover),
  };
};
