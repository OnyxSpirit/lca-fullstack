import type {Request} from 'express';
import type {RowDataPacket} from 'mysql2/promise';
import {query} from '../../config/database.js';
import {assertPermission, can} from '../rbac/rbac.service.js';
import {HttpError} from '../../shared/http-error.js';
import {operationalCandidateSql} from '../users/operational-candidate.js';

interface UserRow extends RowDataPacket{id:string;agency_id:string|null;concession_id:string|null;is_active:number|boolean;eligible:number|boolean}

export interface ResolvedLeadAssignee{assignedUserId:string|null;agencyId:string|null}

export async function validateLeadAssignee(userId:string,request:Request):Promise<ResolvedLeadAssignee>{
  const[user]=await query<UserRow[]>(`SELECT u.id,u.agency_id,a.concession_id,u.is_active,EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.is_active=TRUE JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE WHERE ur.user_id=u.id AND p.code IN('sales.create','crm.prospect.update')) eligible FROM users u LEFT JOIN agencies a ON a.id=u.agency_id WHERE u.id=? AND ${operationalCandidateSql('u')}`,[userId]);
  if(!user)throw new HttpError(400,'Le commercial sélectionné est introuvable.');
  if(!user.is_active)throw new HttpError(400,'Le commercial sélectionné est inactif.');
  if(!user.eligible)throw new HttpError(400,'Cet utilisateur ne peut pas être affecté à un prospect.');
  const assignmentScope=await assertPermission(request,'crm.prospect.assign');
  if(assignmentScope==='OWN'&&String(user.id)!==String(request.user?.sub))throw new HttpError(403,'Le scope OWN autorise uniquement une affectation à soi-même.');
  if(assignmentScope==='AGENCY'&&String(user.agency_id)!==String(request.user?.agencyId))throw new HttpError(403,"Le commercial sélectionné n’appartient pas à cette agence.");
  if(assignmentScope==='CONCESSION'){
    const[actorAgency]=await query<RowDataPacket[]>('SELECT concession_id FROM agencies WHERE id=?',[request.user?.agencyId]);
    if(!actorAgency||String(user.concession_id)!==String(actorAgency.concession_id))throw new HttpError(403,"Le commercial sélectionné n’appartient pas à cette concession.");
  }
  return{assignedUserId:String(user.id),agencyId:user.agency_id==null?null:String(user.agency_id)};
}

export async function resolveLeadAssignee(requestedAssignedUserId:unknown,request:Request):Promise<ResolvedLeadAssignee>{
  const requested=typeof requestedAssignedUserId==='string'||typeof requestedAssignedUserId==='number'?String(requestedAssignedUserId).trim():'';
  if(requested){if(!/^\d+$/.test(requested))throw new HttpError(400,'Le commercial sélectionné est invalide.');return validateLeadAssignee(requested,request)}
  if(request.rbac&&can(request.rbac,'crm.prospect.update')&&!request.rbac.isSuperAdmin)return{assignedUserId:request.user!.sub,agencyId:request.user?.agencyId??null};
  return{assignedUserId:null,agencyId:request.user?.agencyId??null};
}
