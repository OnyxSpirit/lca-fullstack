export const emptyQualityChecklist={plannedWorkCompleted:false,defectCorrected:false,roadTestPerformed:false,noLeaks:false,levelsChecked:false,cleanlinessChecked:false,result:'passed',reason:'',observations:''};
export type QualityChecklist=typeof emptyQualityChecklist;
export interface QualityChecklistDraft { contextKey:string; values:QualityChecklist }

export const qualityChecklistContextKey=(repairOrderId:string,history:Array<{newStatus?:string}>)=>`${repairOrderId}:${history.filter(item=>item.newStatus==='quality_control').length}`;
export const qualityChecklistFor=(draft:QualityChecklistDraft,contextKey:string):QualityChecklist=>draft.contextKey===contextKey?draft.values:{...emptyQualityChecklist};
export const updateQualityChecklist=<K extends keyof QualityChecklist>(draft:QualityChecklistDraft,contextKey:string,key:K,value:QualityChecklist[K]):QualityChecklistDraft=>({contextKey,values:{...qualityChecklistFor(draft,contextKey),[key]:value}});
