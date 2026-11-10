import type {Request} from 'express';
import type {RowDataPacket} from 'mysql2/promise';
import {query} from '../../config/database.js';
import {assertAgencyBusinessPermission, resolveRequestAgencyContext} from '../rbac/agency-authorization.js';
import {HttpError} from '../../shared/http-error.js';
import {operationalCandidateSql} from '../users/operational-candidate.js';

interface UserRow extends RowDataPacket{id:string;agency_id:string|null;is_active:number|boolean;eligible:number|boolean}

export interface ResolvedLeadAssignee{assignedUserId:string|null;agencyId:string|null}

export async function listCrmTeamMembers(request:Request){
  const scope=await assertAgencyBusinessPermission(request,'crm.prospect.assign'),context=await resolveRequestAgencyContext(request),params:unknown[]=[context.activeAgencyId];let scoped='1=1';
  if(scope==='OWN'){scoped='u.id=?';params.push(context.userId)}
  const rows=await query<RowDataPacket[]>(`SELECT DISTINCT u.id,CONCAT_WS(' ',u.first_name,u.last_name) name,ua.agency_id FROM user_agencies ua JOIN users u ON u.id=ua.user_id JOIN user_agency_roles uar ON uar.user_agency_id=ua.id JOIN roles r ON r.id=uar.role_id AND r.is_active=TRUE AND r.is_system=FALSE JOIN role_permissions rp ON rp.role_id=r.id AND rp.scope IN('OWN','AGENCY') JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE WHERE ua.agency_id=? AND ua.status='ACTIVE' AND u.is_active=TRUE AND p.code IN('sales.create','crm.prospect.update') AND ${operationalCandidateSql('u')} AND ${scoped} ORDER BY name`,params);
  return rows.map(row=>({id:String(row.id),name:String(row.name),agencyId:String(row.agency_id)}));
}

export async function validateLeadAssignee(userId:string,request:Request):Promise<ResolvedLeadAssignee>{
  const scope=await assertAgencyBusinessPermission(request,'crm.prospect.assign'),context=await resolveRequestAgencyContext(request),[user]=await query<UserRow[]>(`SELECT u.id,ua.agency_id,u.is_active,EXISTS(SELECT 1 FROM user_agency_roles uar JOIN roles r ON r.id=uar.role_id AND r.is_active=TRUE AND r.is_system=FALSE JOIN role_permissions rp ON rp.role_id=r.id AND rp.scope IN('OWN','AGENCY') JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE WHERE uar.user_agency_id=ua.id AND p.code IN('sales.create','crm.prospect.update')) eligible FROM users u JOIN user_agencies ua ON ua.user_id=u.id AND ua.agency_id=? AND ua.status='ACTIVE' WHERE u.id=? AND ${operationalCandidateSql('u')}`,[context.activeAgencyId,userId]);
  if(!user)throw new HttpError(400,'Le commercial sélectionné est introuvable.');
  if(!user.is_active)throw new HttpError(400,'Le commercial sélectionné est inactif.');
  if(!user.eligible)throw new HttpError(400,'Cet utilisateur ne peut pas être affecté à un prospect.');
  if(scope==='OWN'&&String(user.id)!==context.userId)throw new HttpError(403,'Le scope OWN autorise uniquement une affectation à soi-même.');
  return{assignedUserId:String(user.id),agencyId:user.agency_id==null?null:String(user.agency_id)};
}

export async function resolveLeadAssignee(requestedAssignedUserId:unknown,request:Request):Promise<ResolvedLeadAssignee>{
  const requested=typeof requestedAssignedUserId==='string'||typeof requestedAssignedUserId==='number'?String(requestedAssignedUserId).trim():'';
  if(requested){if(!/^\d+$/.test(requested))throw new HttpError(400,'Le commercial sélectionné est invalide.');return validateLeadAssignee(requested,request)}
  const context=await resolveRequestAgencyContext(request);
  if(context.permissions.has('crm.prospect.update')&&['OWN','AGENCY'].includes(String(context.permissions.get('crm.prospect.update'))))return{assignedUserId:context.userId,agencyId:context.activeAgencyId};
  return{assignedUserId:null,agencyId:context.activeAgencyId};
}
