import type {Request} from 'express';
import type {PermissionScope} from '../rbac/rbac.service.js';
import {HttpError} from '../../shared/http-error.js';

export const CRM_LEAD_VIEW_PERMISSION='crm.prospect.view';
export const CRM_LEAD_OWNER_SQL='l.assigned_user_id';
export const crmLeadAgencySql=(_ownerAlias='u',_creatorAlias='creator')=>`l.agency_id`;

export function crmLeadScope(request:Request,permission:string,alias=crmLeadAgencySql(),applyFilters=false){
  const requestedCommercial=typeof request.query.commercialId==='string'?request.query.commercialId:null;
  const migrated=Boolean(request.agencyRbac),permissionScope=request.agencyRbac?.permissions.get(permission)??request.rbac?.permissions.get(permission);
  const agencyId=request.agencyRbac?.activeAgencyId??request.user?.agencyId;
  if(!agencyId)throw new HttpError(403,'Aucune agence associée à cet utilisateur');
  if(permissionScope==='OWN'){
    if(applyFilters&&requestedCommercial&&requestedCommercial!==request.user?.sub)throw new HttpError(403,'Cet utilisateur ne peut consulter que son portefeuille');
    return{sql:`${alias}=? AND ${CRM_LEAD_OWNER_SQL}=?`,params:[agencyId,request.user?.sub]};
  }
  if(permissionScope==='AGENCY')return applyFilters?{sql:`${alias}=? AND (? IS NULL OR l.assigned_user_id=?)`,params:[agencyId,requestedCommercial,requestedCommercial]}:{sql:`${alias}=?`,params:[agencyId]};
  if(!migrated&&permissionScope==='CONCESSION')return applyFilters?{sql:`${alias} IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?)) AND (? IS NULL OR l.assigned_user_id=?)`,params:[agencyId,requestedCommercial,requestedCommercial]}:{sql:`${alias} IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`,params:[agencyId]};
  if(!migrated&&permissionScope==='GLOBAL'){const requestedAgency=typeof request.query.agencyId==='string'?request.query.agencyId:null;return applyFilters?{sql:`(? IS NULL OR ${alias}=?) AND (? IS NULL OR l.assigned_user_id=?)`,params:[requestedAgency,requestedAgency,requestedCommercial,requestedCommercial]}:{sql:'1=1',params:[]}}
  throw new HttpError(403,`Scope métier invalide pour ${permission}`);
}

export interface CrmLeadVisibilityResource{assignedUserId:string|null;agencyId:string|null;concessionId:string|null}
export interface CrmLeadVisibilityCandidate{userId:string;agencyId:string|null;concessionId:string|null;permissionCode:string|null;scope:PermissionScope|null}

export function canReadCrmLead(resource:CrmLeadVisibilityResource,candidate:CrmLeadVisibilityCandidate){
  if(candidate.permissionCode!==CRM_LEAD_VIEW_PERMISSION)return false;
  if(candidate.scope==='GLOBAL')return true;
  if(candidate.scope==='OWN')return resource.assignedUserId!==null&&candidate.userId===resource.assignedUserId;
  if(candidate.scope==='AGENCY')return resource.agencyId!==null&&candidate.agencyId===resource.agencyId;
  if(candidate.scope==='CONCESSION')return resource.concessionId!==null&&candidate.concessionId===resource.concessionId;
  return false;
}

export const selectCrmLeadRealtimeRecipients=(resource:CrmLeadVisibilityResource,candidates:CrmLeadVisibilityCandidate[])=>
  [...new Set(candidates.filter(candidate=>canReadCrmLead(resource,candidate)).map(candidate=>candidate.userId))];
