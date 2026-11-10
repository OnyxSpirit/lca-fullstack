import type {RowDataPacket} from 'mysql2/promise';
import {query} from '../../config/database.js';
import {emitToUserAgencyContext} from '../../realtime/socket.js';
import {crmLeadAgencySql,selectCrmLeadRealtimeRecipients,type CrmLeadVisibilityCandidate,type CrmLeadVisibilityResource} from './crm-visibility.js';

export type CrmLeadChangeType='created'|'updated'|'stage'|'appointment'|'appointment_updated'|'appointment_cancelled'|'test_drive'|'quotation'|'sale'|'activity';
export interface CrmLeadUpdatedPayload{leadId:string;opportunityId:string;changeType:CrmLeadChangeType;customerChanged:boolean}

/**
 * Publish only a resource hint. Recipients are resolved from the current,
 * committed RBAC state; clients must reload the resource through the HTTP API.
 */
export async function publishCrmLeadUpdated(input:{leadId?:string;opportunityId?:string;changeType:CrmLeadChangeType;customerChanged?:boolean}){
  try{
    const leadAgencySql=crmLeadAgencySql('lead_owner','creator');
    const[lead]=await query<RowDataPacket[]>(`SELECT l.id lead_id,o.id opportunity_id,l.assigned_user_id,
      ${leadAgencySql} agency_id,a.concession_id
      FROM leads l JOIN opportunities o ON o.lead_id=l.id
      LEFT JOIN users lead_owner ON lead_owner.id=l.assigned_user_id
      LEFT JOIN users creator ON creator.id=l.created_by
      LEFT JOIN agencies a ON a.id=${leadAgencySql}
      WHERE (? IS NOT NULL AND l.id=?) OR (? IS NOT NULL AND o.id=?) LIMIT 1`,[input.leadId??null,input.leadId??null,input.opportunityId??null,input.opportunityId??null]);
    if(!lead)return;
    const candidates=await query<RowDataPacket[]>(`SELECT u.id user_id,ua.agency_id,a.concession_id,p.code permission_code,rp.scope FROM users u
      JOIN user_agencies ua ON ua.user_id=u.id AND ua.status='ACTIVE'
      JOIN agencies a ON a.id=ua.agency_id AND a.is_active=TRUE
      JOIN user_agency_roles uar ON uar.user_agency_id=ua.id
      JOIN roles r ON r.id=uar.role_id AND r.is_active=TRUE AND r.is_system=FALSE
      LEFT JOIN role_permissions rp ON rp.role_id=r.id
      LEFT JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE
      WHERE u.is_active=TRUE AND p.code='crm.prospect.view' AND rp.scope IN('OWN','AGENCY') AND ua.agency_id=?`,[lead.agency_id]);
    const resource:CrmLeadVisibilityResource={assignedUserId:lead.assigned_user_id==null?null:String(lead.assigned_user_id),agencyId:lead.agency_id==null?null:String(lead.agency_id),concessionId:lead.concession_id==null?null:String(lead.concession_id)};
    const recipients=selectCrmLeadRealtimeRecipients(resource,candidates.map(row=>({
      userId:String(row.user_id),agencyId:row.agency_id==null?null:String(row.agency_id),concessionId:row.concession_id==null?null:String(row.concession_id),
      permissionCode:row.permission_code==null?null:String(row.permission_code),scope:row.scope??null,
    }) satisfies CrmLeadVisibilityCandidate));
    const payload:CrmLeadUpdatedPayload={leadId:String(lead.lead_id),opportunityId:String(lead.opportunity_id),changeType:input.changeType,customerChanged:Boolean(input.customerChanged)};
    for(const recipient of recipients)await emitToUserAgencyContext(recipient,resource.agencyId,'crm:lead-updated',payload);
  }catch(error){
    // A realtime hint must never turn an already committed business mutation into an HTTP failure.
    console.error('Événement CRM non émis',error);
  }
}
