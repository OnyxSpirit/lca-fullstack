import type {PermissionScope} from '../rbac/rbac.service.js';

export const CRM_LEAD_VIEW_PERMISSION='crm.prospect.view';
export const CRM_LEAD_OWNER_SQL='l.assigned_user_id';
export const crmLeadAgencySql=(ownerAlias='u',creatorAlias='creator')=>`COALESCE(${ownerAlias}.agency_id,${creatorAlias}.agency_id)`;

export interface CrmLeadVisibilityResource{assignedUserId:string|null;agencyId:string|null;concessionId:string|null}
export interface CrmLeadVisibilityCandidate{userId:string;agencyId:string|null;concessionId:string|null;permissionCode:string|null;scope:PermissionScope|null;roleCode:string|null;roleIsSystem:boolean}

export function canReadCrmLead(resource:CrmLeadVisibilityResource,candidate:CrmLeadVisibilityCandidate){
  if(candidate.roleCode==='SUPER_ADMIN'&&candidate.roleIsSystem)return true;
  if(candidate.permissionCode!==CRM_LEAD_VIEW_PERMISSION)return false;
  if(candidate.scope==='GLOBAL')return true;
  if(candidate.scope==='OWN')return resource.assignedUserId!==null&&candidate.userId===resource.assignedUserId;
  if(candidate.scope==='AGENCY')return resource.agencyId!==null&&candidate.agencyId===resource.agencyId;
  if(candidate.scope==='CONCESSION')return resource.concessionId!==null&&candidate.concessionId===resource.concessionId;
  return false;
}

export const selectCrmLeadRealtimeRecipients=(resource:CrmLeadVisibilityResource,candidates:CrmLeadVisibilityCandidate[])=>
  [...new Set(candidates.filter(candidate=>canReadCrmLead(resource,candidate)).map(candidate=>candidate.userId))];
