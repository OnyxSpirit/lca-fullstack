import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {HttpError} from '../../shared/http-error.js';

type Input=Record<string,unknown>;
export const hasEmployeeInput=(body:Input)=>['isEmployee','employeeNumber','employeePosition','employeeHireDate','employeeStatus'].some(key=>Object.hasOwn(body,key));
const optional=(v:unknown,label:string,max:number)=>{const x=typeof v==='string'?v.trim():'';if(x.length>max)throw new HttpError(400,`${label} trop long.`);return x||null};
const hireDate=(v:unknown)=>{const x=String(v??'');if(!/^\d{4}-\d{2}-\d{2}$/.test(x)||Number.isNaN(Date.parse(`${x}T00:00:00Z`)))throw new HttpError(400,'Date d’embauche invalide.');return x};

export async function syncEmployeeProfile(c:PoolConnection,userId:string,body:Input,actorId:string,defaultPosition:unknown){
  if(typeof body.isEmployee!=='boolean')throw new HttpError(400,'Le choix Employé de l’entreprise est obligatoire.');
  const[rows]=await c.execute<RowDataPacket[]>('SELECT id,employment_status FROM employee_profiles WHERE user_id=? FOR UPDATE',[userId]),existing=rows[0];
  if(!body.isEmployee){if(existing)await c.execute("UPDATE employee_profiles SET employment_status='departed',updated_by=? WHERE id=?",[actorId,existing.id]);return}
  const status=body.employeeStatus==null?(existing?String(existing.employment_status):'active'):String(body.employeeStatus);
  if(!['active','inactive','departed'].includes(status))throw new HttpError(400,'Statut RH invalide.');
  const position=Object.hasOwn(body,'employeePosition')?optional(body.employeePosition,'Fonction RH',120):optional(defaultPosition,'Fonction RH',120);
  if(existing){const sets=['employment_status=?','updated_by=?'],values:unknown[]=[status,actorId];if(Object.hasOwn(body,'employeeNumber')&&String(body.employeeNumber??'').trim()){sets.push('employee_number=?');values.push(optional(body.employeeNumber,'Matricule',50))}if(Object.hasOwn(body,'employeePosition')||defaultPosition!==undefined){sets.push('position_title=?');values.push(position)}if(Object.hasOwn(body,'employeeHireDate')&&String(body.employeeHireDate??'').trim()){sets.push('hire_date=?');values.push(hireDate(body.employeeHireDate))}await c.execute(`UPDATE employee_profiles SET ${sets.join(',')} WHERE id=?`,[...values,existing.id]);return}
  const number=optional(body.employeeNumber,'Matricule',50)??`EMP-${userId.padStart(6,'0')}`;
  const hired=!String(body.employeeHireDate??'').trim()?new Date().toISOString().slice(0,10):hireDate(body.employeeHireDate);
  await c.execute('INSERT INTO employee_profiles(user_id,employee_number,position_title,hire_date,employment_status,created_by,updated_by) VALUES(?,?,?,?,?,?,?)',[userId,number,position,hired,status,actorId,actorId]);
}
