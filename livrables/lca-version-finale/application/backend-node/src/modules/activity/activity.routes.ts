import {Router,type Request} from 'express';
import type {RowDataPacket} from 'mysql2/promise';
import {query} from '../../config/database.js';
import {asyncHandler} from '../../middleware/error-handler.js';
import {HttpError} from '../../shared/http-error.js';
import {assertPermission,type PermissionScope} from '../rbac/rbac.service.js';

export const activityRouter=Router();
const sensitiveKey=/(password|passwd|token|secret|authorization|credential|cookie|hash)/i;
const restrictedEntities=new Set(['employee','employee_contract','employee_leave','employee_bonus','document']);
const integer=(value:unknown,name:string)=>{const text=String(value??'').trim();if(!/^\d+$/.test(text))throw new HttpError(400,`${name} invalide`);return Number(text)};
const optionalId=(value:unknown,name:string)=>{const text=String(value??'').trim();return text?String(integer(text,name)):null};
const isoDate=(value:unknown,name:string,end=false)=>{const text=String(value??'').trim();if(!text)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(text))throw new HttpError(400,`${name} invalide`);const date=new Date(`${text}T${end?'23:59:59.999':'00:00:00.000'}Z`);if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==text)throw new HttpError(400,`${name} invalide`);return date.toISOString().slice(0,19).replace('T',' ')};
const sanitize=(value:unknown):unknown=>Array.isArray(value)?value.map(sanitize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([key])=>!sensitiveKey.test(key)).map(([key,item])=>[key,sanitize(item)])):value;
const json=(value:unknown)=>{if(value==null)return null;try{return sanitize(typeof value==='string'?JSON.parse(value):value)}catch{return null}};
const category=(action:string)=>{const value=action.toLowerCase();if(/refund|rembours/.test(value))return'REFUND';if(/payment|paid|encaisse/.test(value))return'PAYMENT';if(/reject|refus/.test(value))return'REJECT';if(/approv|valid/.test(value))return'APPROVE';if(/cancel|annul|archive|delete/.test(value))return'CANCEL';if(/status|stage|assign|link|unlink|deliver|return/.test(value))return'STATUS';if(/create|upload|issue/.test(value))return'CREATE';if(/update|change|reset/.test(value))return'UPDATE';if(/document|signature/.test(value))return'DOCUMENT';if(/permission|role|password|login|logout/.test(value))return'SECURITY';return'OTHER'};
const categories=['CREATE','UPDATE','STATUS','APPROVE','REJECT','CANCEL','PAYMENT','REFUND','DOCUMENT','SECURITY','OTHER'] as const;
const categorySql=`CASE WHEN LOWER(al.action) REGEXP 'refund|rembours' THEN 'REFUND' WHEN LOWER(al.action) REGEXP 'payment|paid|encaisse' THEN 'PAYMENT' WHEN LOWER(al.action) REGEXP 'reject|refus' THEN 'REJECT' WHEN LOWER(al.action) REGEXP 'approv|valid' THEN 'APPROVE' WHEN LOWER(al.action) REGEXP 'cancel|annul|archive|delete' THEN 'CANCEL' WHEN LOWER(al.action) REGEXP 'status|stage|assign|link|unlink|deliver|return' THEN 'STATUS' WHEN LOWER(al.action) REGEXP 'create|upload|issue' THEN 'CREATE' WHEN LOWER(al.action) REGEXP 'update|change|reset' THEN 'UPDATE' WHEN LOWER(al.action) REGEXP 'document|signature' THEN 'DOCUMENT' WHEN LOWER(al.action) REGEXP 'permission|role|password|login|logout' THEN 'SECURITY' ELSE 'OTHER' END`;

type Scope={scope:PermissionScope;sql:string;params:unknown[]};
async function activityScope(request:Request):Promise<Scope>{
  const scope=await assertPermission(request,'activity.view');
  if(!scope)throw new HttpError(403,'Permission activité requise');
  const userId=String(request.user!.sub),agencyId=String(request.user!.agencyId??'');
  if(scope==='GLOBAL')return{scope,sql:'1=1',params:[]};
  if(scope==='OWN')return{scope,sql:'al.user_id=?',params:[userId]};
  if(!agencyId)throw new HttpError(403,'Agence requise pour ce périmètre');
  if(scope==='AGENCY')return{scope,sql:'al.agency_id=?',params:[agencyId]};
  if(scope==='CONCESSION')return{scope,sql:'al.concession_id=(SELECT concession_id FROM agencies WHERE id=?)',params:[agencyId]};
  throw new HttpError(403,'Périmètre activité invalide');
}

activityRouter.get('/activity/filters',asyncHandler(async(request,response)=>{
  const access=await activityScope(request);
  const base=` FROM audit_logs al LEFT JOIN users actor ON actor.id=al.user_id LEFT JOIN agencies actor_agency ON actor_agency.id=actor.agency_id WHERE ${access.sql}`;
  const [users,modules,agencies]=await Promise.all([
    query<RowDataPacket[]>(`SELECT DISTINCT actor.id,CONCAT_WS(' ',actor.first_name,actor.last_name) name,actor.is_active FROM audit_logs al LEFT JOIN users actor ON actor.id=al.user_id LEFT JOIN agencies actor_agency ON actor_agency.id=actor.agency_id WHERE ${access.sql} AND actor.id IS NOT NULL ORDER BY name`,access.params),
    query<RowDataPacket[]>(`SELECT DISTINCT al.module${base} ORDER BY al.module`,access.params),
    query<RowDataPacket[]>(`SELECT DISTINCT al.agency_id id,event_agency.name FROM audit_logs al LEFT JOIN users actor ON actor.id=al.user_id LEFT JOIN agencies actor_agency ON actor_agency.id=actor.agency_id LEFT JOIN agencies event_agency ON event_agency.id=al.agency_id WHERE ${access.sql} AND al.agency_id IS NOT NULL ORDER BY name`,access.params)
  ]);
  response.json({scope:access.scope,categories,users:users.map(row=>({id:String(row.id),name:row.name||`Utilisateur #${row.id}`,isActive:Boolean(row.is_active)})),modules:modules.map(row=>String(row.module)),agencies:agencies.filter(row=>row.id).map(row=>({id:String(row.id),name:row.name}))});
}));

activityRouter.get('/activity',asyncHandler(async(request,response)=>{
  const access=await activityScope(request),page=Math.max(1,integer(request.query.page??'1','Page')),pageSize=Math.min(100,Math.max(1,integer(request.query.pageSize??'25','Taille de page')));
  const userId=optionalId(request.query.userId,'Utilisateur'),agencyId=optionalId(request.query.agencyId,'Agence'),module=String(request.query.module??'').trim(),entityType=String(request.query.entityType??'').trim(),actionCategory=String(request.query.category??'').trim().toUpperCase(),search=String(request.query.search??'').trim().slice(0,100),from=isoDate(request.query.from,'Date de début'),to=isoDate(request.query.to,'Date de fin',true);
  if(actionCategory&&!categories.includes(actionCategory as typeof categories[number]))throw new HttpError(400,'Catégorie invalide');
  const conditions=[access.sql],params=[...access.params];
  if(userId){conditions.push('al.user_id=?');params.push(userId)}if(agencyId){conditions.push('al.agency_id=?');params.push(agencyId)}if(module){conditions.push('al.module=?');params.push(module)}if(entityType){conditions.push('al.entity_type=?');params.push(entityType)}if(from){conditions.push('al.created_at>=?');params.push(from)}if(to){conditions.push('al.created_at<=?');params.push(to)}if(search){conditions.push("(al.action LIKE ? OR al.module LIKE ? OR al.entity_type LIKE ? OR CONCAT_WS(' ',actor.first_name,actor.last_name) LIKE ?)");params.push(...Array(4).fill(`%${search}%`))}
  if(actionCategory){conditions.push(`${categorySql}=?`);params.push(actionCategory)}
  const base=` FROM audit_logs al LEFT JOIN users actor ON actor.id=al.user_id LEFT JOIN agencies actor_agency ON actor_agency.id=actor.agency_id LEFT JOIN agencies event_agency ON event_agency.id=al.agency_id LEFT JOIN concessions event_concession ON event_concession.id=al.concession_id LEFT JOIN concessions actor_concession ON actor_concession.id=actor_agency.concession_id WHERE ${conditions.join(' AND ')}`;
  const countRows=await query<RowDataPacket[]>(`SELECT COUNT(*) total${base}`,params);
  const total=Number(countRows[0]?.total??0);
  const paged=await query<RowDataPacket[]>(`SELECT al.id,al.user_id,al.module,al.entity_type,al.entity_id,al.action,al.old_values,al.new_values,al.ip_address,al.created_at,actor.first_name,actor.last_name,actor.is_active,al.agency_id,event_agency.name agency_name,al.concession_id,event_concession.name concession_name${base} ORDER BY al.created_at DESC,al.id DESC LIMIT ? OFFSET ?`,[...params,pageSize,(page-1)*pageSize]);
  response.json({rows:paged.map(row=>{const restricted=restrictedEntities.has(String(row.entity_type));return{id:String(row.id),userId:row.user_id?String(row.user_id):null,actor:row.user_id?{name:`${row.first_name??''} ${row.last_name??''}`.trim()||`Utilisateur #${row.user_id}`,isActive:Boolean(row.is_active)}:{name:'Utilisateur supprimé ou système',isActive:false},module:row.module,entityType:row.entity_type,entityId:row.entity_id?String(row.entity_id):null,resource:`${row.entity_type}${row.entity_id?` #${row.entity_id}`:''}`,action:row.action,category:category(String(row.action)),createdAt:row.created_at,context:{agencyId:row.agency_id?String(row.agency_id):null,agencyName:row.agency_name??null,concessionId:row.concession_id?String(row.concession_id):null,concessionName:row.concession_name??null},detailsRestricted:restricted,oldValues:restricted?null:json(row.old_values),newValues:restricted?null:json(row.new_values),ipAddress:row.ip_address??null}}),pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)},scope:access.scope});
}));
