import type {Request} from 'express';
import type {RowDataPacket} from 'mysql2/promise';
import {query} from '../../config/database.js';
import {unrestricted} from '../../middleware/authorize.js';
import {HttpError} from '../../shared/http-error.js';

const COMMERCIAL_ROLES=['SALES_AGENT','SALES_MANAGER'] as const;
interface UserRow extends RowDataPacket{id:string;agency_id:string|null;is_active:number|boolean;roles:string|null}

export interface ResolvedLeadAssignee{assignedUserId:string|null;agencyId:string|null}

export async function validateLeadAssignee(userId:string,request:Request):Promise<ResolvedLeadAssignee>{
  const[user]=await query<UserRow[]>(`SELECT u.id,u.agency_id,u.is_active,GROUP_CONCAT(r.code) roles FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE u.id=? GROUP BY u.id`,[userId]);
  if(!user)throw new HttpError(400,'Le commercial sélectionné est introuvable.');
  if(!user.is_active)throw new HttpError(400,'Le commercial sélectionné est inactif.');
  const roles=String(user.roles??'').split(',');
  if(!roles.some(role=>COMMERCIAL_ROLES.includes(role as typeof COMMERCIAL_ROLES[number])))throw new HttpError(400,'Cet utilisateur ne peut pas être affecté à un prospect.');
  if(!unrestricted(request)&&String(user.agency_id)!==String(request.user?.agencyId))throw new HttpError(403,"Le commercial sélectionné n’appartient pas à cette agence.");
  return{assignedUserId:String(user.id),agencyId:user.agency_id==null?null:String(user.agency_id)};
}

export async function resolveLeadAssignee(requestedAssignedUserId:unknown,request:Request):Promise<ResolvedLeadAssignee>{
  const requested=typeof requestedAssignedUserId==='string'||typeof requestedAssignedUserId==='number'?String(requestedAssignedUserId).trim():'';
  if(requested){if(!/^\d+$/.test(requested))throw new HttpError(400,'Le commercial sélectionné est invalide.');return validateLeadAssignee(requested,request)}
  if(request.user?.roles.some(role=>COMMERCIAL_ROLES.includes(role as typeof COMMERCIAL_ROLES[number])))return validateLeadAssignee(request.user.sub,request);
  return{assignedUserId:null,agencyId:request.user?.agencyId??null};
}
