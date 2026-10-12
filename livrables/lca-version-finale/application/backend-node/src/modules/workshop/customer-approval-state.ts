export type WarrantyDecisionStatus='PENDING'|'APPROVED'|'REJECTED'|null;

export interface CustomerApprovalStateInput{
  status:string;
  latestApproval?:{approved:boolean|number;approvedAmount:number|null}|null;
  workStarted:boolean;
  warrantyDecisionStatus:WarrantyDecisionStatus;
  estimateTotal:number;
}

export function customerApprovalState(input:CustomerApprovalStateInput){
  const{status,latestApproval,workStarted,warrantyDecisionStatus,estimateTotal}=input;
  const blockReason=latestApproval
    ? 'La décision du client a déjà été enregistrée.'
    : status!=='waiting_approval'
      ? 'La validation client sera disponible lorsque le diagnostic et le chiffrage auront été finalisés.'
      : workStarted
        ? 'La validation client n’est plus disponible car les travaux ont déjà commencé.'
        : warrantyDecisionStatus==='PENDING'
          ? 'La décision de prise en charge constructeur doit être enregistrée avant la validation client.'
          : estimateTotal<=0
            ? 'Un chiffrage positif est obligatoire avant la validation client.'
            : null;
  return{required:status==='waiting_approval',decided:Boolean(latestApproval),decision:latestApproval?(Number(latestApproval.approved)===1?'APPROVED' as const:'REJECTED' as const):null,canDecide:blockReason===null,blockReason,submittedAmount:latestApproval?.approvedAmount==null?estimateTotal:Number(latestApproval.approvedAmount)};
}
