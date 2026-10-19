import type {Request} from 'express';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {query} from '../../config/database.js';
import {HttpError} from '../../shared/http-error.js';
import {assertPermission, type PermissionScope} from '../rbac/rbac.service.js';
import {syncEmployeePersonnelIdentity} from './personnel-identity.service.js';

type Input=Record<string,unknown>;
export const hasEmployeeInput=(body:Input)=>['isEmployee','employeeNumber','employeePosition','employeeHireDate','employeeStatus'].some(key=>Object.hasOwn(body,key));
const optional=(value:unknown,label:string,max:number)=>{const text=typeof value==='string'?value.trim():'';if(text.length>max)throw new HttpError(400,`${label} trop long.`);return text||null};
const required=(value:unknown,label:string,max:number)=>{const text=optional(value,label,max);if(!text)throw new HttpError(400,`${label} obligatoire.`);return text};
const validDate=(value:unknown)=>{const text=String(value??'');if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||Number.isNaN(Date.parse(`${text}T00:00:00Z`)))throw new HttpError(400,'Date d’embauche invalide.');return text};

export async function assertEmployeeAgencyScope(request:Request,agencyId:string){
  const scope=await assertPermission(request,'hr.employees.manage') as PermissionScope|null;
  const[agency]=await query<RowDataPacket[]>('SELECT id,concession_id,is_active FROM agencies WHERE id=?',[agencyId]);
  if(!agency||!agency.is_active)throw new HttpError(400,'Agence RH invalide ou inactive.');
  if(scope==='GLOBAL')return;
  if(scope==='AGENCY'&&String(agency.id)===String(request.user!.agencyId))return;
  if(scope==='CONCESSION'){
    const[actor]=await query<RowDataPacket[]>('SELECT concession_id FROM agencies WHERE id=?',[request.user!.agencyId]);
    if(actor&&String(actor.concession_id)===String(agency.concession_id))return;
  }
  throw new HttpError(403,'Hors portée de la permission hr.employees.manage');
}

export interface EmployeeSyncIdentity{agencyId:string;firstName:unknown;lastName:unknown;email:unknown;phone:unknown}

export async function syncEmployeeProfile(connection:PoolConnection,userId:string,body:Input,actorId:string,defaultPosition:unknown,identity:EmployeeSyncIdentity){
  if(typeof body.isEmployee!=='boolean')throw new HttpError(400,'Le choix Employé de la concession est obligatoire.');
  const[rows]=await connection.execute<RowDataPacket[]>('SELECT id,employment_status FROM employee_profiles WHERE user_id=? FOR UPDATE',[userId]),existing=rows[0];
  if(!body.isEmployee){
    if(existing)await connection.execute("UPDATE employee_profiles SET employment_status='departed',updated_by=? WHERE id=?",[actorId,existing.id]);
    if(existing)await syncEmployeePersonnelIdentity(connection,String(existing.id));
    return existing?{id:String(existing.id),status:'departed'}:null;
  }
  const[agencies]=await connection.execute<RowDataPacket[]>('SELECT concession_id FROM agencies WHERE id=? AND is_active=TRUE',[identity.agencyId]),agency=agencies[0];
  if(!agency)throw new HttpError(400,'Agence RH invalide ou inactive.');
  const status=body.employeeStatus==null?(existing?String(existing.employment_status):'active'):String(body.employeeStatus);
  if(!['active','inactive','departed'].includes(status))throw new HttpError(400,'Statut RH invalide.');
  const position=Object.hasOwn(body,'employeePosition')?optional(body.employeePosition,'Fonction RH',120):optional(defaultPosition,'Fonction RH',120);
  const common=[String(agency.concession_id),identity.agencyId,required(identity.firstName,'Prénom',100),required(identity.lastName,'Nom',100),optional(identity.email,'Email RH',190),optional(identity.phone,'Téléphone',50)];
  if(existing){
    const sets=['concession_id=?','agency_id=?','first_name=?','last_name=?','email=?','phone=?','employment_status=?','updated_by=?'],values:unknown[]=[...common,status,actorId];
    if(Object.hasOwn(body,'employeeNumber')&&String(body.employeeNumber??'').trim()){sets.push('employee_number=?');values.push(optional(body.employeeNumber,'Matricule',50))}
    if(Object.hasOwn(body,'employeePosition')||defaultPosition!==undefined){sets.push('position_title=?');values.push(position)}
    if(Object.hasOwn(body,'employeeHireDate')&&String(body.employeeHireDate??'').trim()){sets.push('hire_date=?');values.push(validDate(body.employeeHireDate))}
    await connection.execute(`UPDATE employee_profiles SET ${sets.join(',')} WHERE id=?`,[...values,existing.id]);
    await syncEmployeePersonnelIdentity(connection,String(existing.id));
    return{id:String(existing.id),status};
  }
  const number=optional(body.employeeNumber,'Matricule',50)??`EMP-${userId.padStart(6,'0')}`;
  const hired=String(body.employeeHireDate??'').trim()?validDate(body.employeeHireDate):new Date().toISOString().slice(0,10);
  const[result]=await connection.execute<any>('INSERT INTO employee_profiles(user_id,concession_id,agency_id,first_name,last_name,email,phone,employee_number,position_title,hire_date,employment_status,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[userId,...common,number,position,hired,status,actorId,actorId]);
  await syncEmployeePersonnelIdentity(connection,String(result.insertId));
  return{id:String(result.insertId),status};
}
