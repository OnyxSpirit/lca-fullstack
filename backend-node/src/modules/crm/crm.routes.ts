import { Router, type Request } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { execute, query, transaction } from '../../config/database.js';
import { authorize, unrestricted } from '../../middleware/authorize.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
import { notifyCrm } from './crm.notifications.js';

export const crmRouter=Router();

const CRM_READ=['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','RECEPTIONIST'];
const CRM_WRITE=['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','RECEPTIONIST'];
const CRM_STAGE=['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT'];
const stages=['new','contacted','qualified','appointment','test_drive','offer','negotiation','won','lost'] as const;
const activityTypes=['call','email','task','appointment','test_drive','note','other'] as const;
const activityStatuses=['planned','completed','cancelled'] as const;
const leadSources=['Passage Showroom','Web','Téléphone','LeBonCoin','Parrainage','Campagne Marketing'] as const;
const priorities=['low','medium','high','urgent'] as const;

interface LeadRow extends RowDataPacket { lead_id:string; opportunity_id:string; agency_id:string|null; assigned_user_id:string|null; assigned_user_name:string }
interface UserRow extends RowDataPacket { id:string; agency_id:string|null; roles:string|null }

const leadSelect=`SELECT l.id lead_id,o.id opportunity_id,l.customer_id,l.first_name,l.last_name,l.company_name,l.email,l.phone,l.source,l.status lead_status,l.priority,l.assigned_user_id,l.created_by,o.title,o.stage,o.expected_value,o.probability,o.expected_close_date,o.lost_reason,o.notes,l.created_at,l.updated_at,CONCAT_WS(' ',u.first_name,u.last_name) assigned_user_name,CONCAT_WS(' ',creator.first_name,creator.last_name) created_by_name,u.agency_id,a.name agency_name FROM leads l JOIN opportunities o ON o.lead_id=l.id LEFT JOIN users u ON u.id=l.assigned_user_id LEFT JOIN users creator ON creator.id=l.created_by LEFT JOIN agencies a ON a.id=u.agency_id`;
const mapLead=(row:LeadRow)=>({id:String(row.lead_id),opportunityId:String(row.opportunity_id),customerId:row.customer_id==null?null:String(row.customer_id),firstName:row.first_name??'',lastName:row.last_name??'',companyName:row.company_name??'',email:row.email??'',phone:row.phone??'',source:row.source??'',leadStatus:row.lead_status,priority:row.priority,assignedUserId:row.assigned_user_id==null?null:String(row.assigned_user_id),assignedUserName:row.assigned_user_name??'',createdById:row.created_by==null?null:String(row.created_by),createdByName:row.created_by_name??'',agencyId:row.agency_id==null?null:String(row.agency_id),agencyName:row.agency_name??'',title:row.title,stage:row.stage,expectedValue:row.expected_value,probability:row.probability,expectedCloseDate:row.expected_close_date,lostReason:row.lost_reason,notes:row.notes??'',createdAt:row.created_at,updatedAt:row.updated_at});

const text=(value:unknown,name:string,max=255,required=false)=>{if(value==null||value===''){if(required)throw new HttpError(400,`${name} est requis`);return null;}if(typeof value!=='string')throw new HttpError(400,`${name} doit être une chaîne`);const result=value.trim();if(!result&&required)throw new HttpError(400,`${name} est requis`);if(result.length>max)throw new HttpError(400,`${name} est trop long`);return result||null;};
const numberValue=(value:unknown,name:string,min:number,max:number)=>{if(value==null||value==='')return null;const result=Number(value);if(!Number.isFinite(result)||result<min||result>max)throw new HttpError(400,`${name} est invalide`);return result;};
const dateValue=(value:unknown,name:string)=>{if(value==null||value==='')return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(`${value}T00:00:00Z`)))throw new HttpError(400,`${name} doit être au format AAAA-MM-JJ`);return value;};
const routeId=(value:string|string[]|undefined)=>{const id=Array.isArray(value)?value[0]:value;if(!id||!/^\d+$/.test(id))throw new HttpError(400,'Identifiant invalide');return id;};
const hasRole=(request:Request,roles:string[])=>Boolean(request.user?.roles.some(role=>roles.includes(role)));

function scope(request:Request,alias='u'){
  const requestedAgency=typeof request.query.agencyId==='string'?request.query.agencyId:null;
  const requestedCommercial=typeof request.query.commercialId==='string'?request.query.commercialId:null;
  if(unrestricted(request))return{sql:`(? IS NULL OR ${alias}.agency_id=?) AND (? IS NULL OR l.assigned_user_id=?)`,params:[requestedAgency,requestedAgency,requestedCommercial,requestedCommercial]};
  const agencyId=request.user?.agencyId;
  if(!agencyId)throw new HttpError(403,'Aucune agence associée à cet utilisateur');
  if(hasRole(request,['SALES_AGENT'])){
    if(requestedCommercial&&requestedCommercial!==request.user?.sub)throw new HttpError(403,'Un commercial ne peut consulter que son portefeuille');
    return{sql:`${alias}.agency_id=? AND l.assigned_user_id=?`,params:[agencyId,request.user?.sub]};
  }
  return{sql:`${alias}.agency_id=? AND (? IS NULL OR l.assigned_user_id=?)`,params:[agencyId,requestedCommercial,requestedCommercial]};
}

async function assignee(userId:string,request:Request){
  if(hasRole(request,['SALES_AGENT'])&&userId!==request.user?.sub)throw new HttpError(403,'Un commercial ne peut pas réattribuer son portefeuille');
  const [user]=await query<UserRow[]>(`SELECT u.id,u.agency_id,GROUP_CONCAT(r.code) roles FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND u.is_active=TRUE GROUP BY u.id`,[userId]);
  if(!user)throw new HttpError(400,'Commercial assigné introuvable ou inactif');
  const roles=String(user.roles??'').split(',');
  if(!roles.some(role=>CRM_READ.includes(role)))throw new HttpError(400,'Cet utilisateur ne peut pas recevoir un prospect');
  if(!unrestricted(request)&&String(user.agency_id)!==String(request.user?.agencyId))throw new HttpError(403,'Le commercial appartient à une autre agence');
  return{agencyId:user.agency_id==null?null:String(user.agency_id)};
}

async function accessibleLead(id:string,request:Request){const scoped=scope(request);const[row]=await query<LeadRow[]>(`${leadSelect} WHERE l.id=? AND ${scoped.sql}`,[id,...scoped.params]);if(!row)throw new HttpError(404,'Prospect introuvable');return row;}

crmRouter.get('/leads',authorize(...CRM_READ),asyncHandler(async(request,response)=>{
  const scoped=scope(request);const search=typeof request.query.search==='string'?request.query.search.trim():'';const term=`%${search}%`;const normalizedPhone=search.replace(/[^\d+]/g,'');const phoneTerm=`%${normalizedPhone}%`;const stage=typeof request.query.stage==='string'?request.query.stage:null;if(stage&&!stages.includes(stage as typeof stages[number]))throw new HttpError(400,'Étape CRM invalide');const priority=typeof request.query.priority==='string'?request.query.priority:null;if(priority&&!priorities.includes(priority as typeof priorities[number]))throw new HttpError(400,'Priorité CRM invalide');
  const rows=await query<LeadRow[]>(`${leadSelect} WHERE ${scoped.sql} AND (?='' OR l.first_name LIKE ? OR l.last_name LIKE ? OR l.company_name LIKE ? OR l.email LIKE ? OR o.title LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(l.phone,' ',''),'-',''),'.',''),'(',''),')','') LIKE ?) AND (? IS NULL OR o.stage=?) AND (? IS NULL OR l.priority=?) ORDER BY l.updated_at DESC LIMIT 200`,[...scoped.params,search,term,term,term,term,term,phoneTerm,stage,stage,priority,priority]);response.json(rows.map(mapLead));
}));

crmRouter.get('/leads/:id',authorize(...CRM_READ),asyncHandler(async(request,response)=>{response.json(mapLead(await accessibleLead(routeId(request.params.id),request)));}));

crmRouter.post('/leads',authorize(...CRM_WRITE),asyncHandler(async(request,response)=>{
  const body=request.body as Record<string,unknown>;const title=text(body.title,'title',200,true)!;const firstName=text(body.firstName,'firstName',100);const lastName=text(body.lastName,'lastName',100);const companyName=text(body.companyName,'companyName',200);const email=text(body.email,'email',190);const phone=text(body.phone,'phone',50);if(!lastName&&!companyName)throw new HttpError(400,'Un nom ou une société est requis');if(!phone&&!email)throw new HttpError(400,'Un téléphone ou un e-mail est requis');
  const source=text(body.source,'source',100);if(source&&!leadSources.includes(source as typeof leadSources[number]))throw new HttpError(400,'Source du prospect invalide');const priority=text(body.priority,'priority',20)??'medium';if(!priorities.includes(priority as typeof priorities[number]))throw new HttpError(400,'Priorité CRM invalide');const assignedUserId=text(body.assignedUserId,'assignedUserId',30)??request.user!.sub;const assigned=await assignee(assignedUserId,request);const expectedValue=numberValue(body.expectedValue,'expectedValue',0,9999999999999999);const probability=numberValue(body.probability,'probability',0,100);const expectedCloseDate=dateValue(body.expectedCloseDate,'expectedCloseDate');const notes=text(body.notes,'notes',10000);
  const created=await transaction(async connection=>{const[lead]=await connection.execute<ResultSetHeader>(`INSERT INTO leads(assigned_user_id,created_by,source,status,priority,first_name,last_name,company_name,email,phone,notes) VALUES(?,?,?,'new',?,?,?,?,?,?,?)`,[assignedUserId,request.user!.sub,source,priority,firstName,lastName,companyName,email,phone,notes]);const[opportunity]=await connection.execute<ResultSetHeader>(`INSERT INTO opportunities(lead_id,assigned_user_id,title,stage,expected_value,probability,expected_close_date,notes) VALUES(?,?,?,'new',?,?,?,?)`,[lead.insertId,assignedUserId,title,expectedValue,probability,expectedCloseDate,notes]);return{id:String(lead.insertId),opportunityId:String(opportunity.insertId)};});
  await notifyCrm({leadId:created.id,agencyId:assigned.agencyId,assignedUserId,actorUserId:request.user!.sub,subject:'Nouveau prospect',message:`Le prospect ${[firstName,lastName].filter(Boolean).join(' ')||companyName} vous a été attribué.`});response.status(201).json(created);
}));

crmRouter.patch('/leads/:id',authorize(...CRM_WRITE),asyncHandler(async(request,response)=>{
  const leadId=routeId(request.params.id);const current=await accessibleLead(leadId,request);const body=request.body as Record<string,unknown>;const leadFields:Record<string,string>={firstName:'first_name',lastName:'last_name',companyName:'company_name',email:'email',phone:'phone',source:'source',priority:'priority',notes:'notes'};const opportunityFields:Record<string,string>={title:'title',expectedValue:'expected_value',probability:'probability',expectedCloseDate:'expected_close_date'};const leadSets:string[]=[],leadValues:any[]=[],oppSets:string[]=[],oppValues:any[]=[];
  for(const[key,column]of Object.entries(leadFields))if(Object.hasOwn(body,key)){const value=text(body[key],key,key==='notes'?10000:key==='companyName'?200:key==='email'?190:key==='phone'?50:100);if(key==='source'&&value&&!leadSources.includes(value as typeof leadSources[number]))throw new HttpError(400,'Source du prospect invalide');if(key==='priority'&&!priorities.includes(value as typeof priorities[number]))throw new HttpError(400,'Priorité CRM invalide');leadSets.push(`${column}=?`);leadValues.push(value);}
  for(const[key,column]of Object.entries(opportunityFields))if(Object.hasOwn(body,key)){const value=key==='expectedValue'?numberValue(body[key],key,0,9999999999999999):key==='probability'?numberValue(body[key],key,0,100):key==='expectedCloseDate'?dateValue(body[key],key):text(body[key],key,200,key==='title');oppSets.push(`${column}=?`);oppValues.push(value);}
  let assignedUserId=current.assigned_user_id==null?null:String(current.assigned_user_id),agencyId=current.agency_id==null?null:String(current.agency_id);if(Object.hasOwn(body,'assignedUserId')){assignedUserId=text(body.assignedUserId,'assignedUserId',30,true)!;agencyId=(await assignee(assignedUserId,request)).agencyId;leadSets.push('assigned_user_id=?');leadValues.push(assignedUserId);oppSets.push('assigned_user_id=?');oppValues.push(assignedUserId);}
  if(!leadSets.length&&!oppSets.length)throw new HttpError(400,'Aucun champ modifiable fourni');await transaction(async connection=>{if(leadSets.length)await connection.execute(`UPDATE leads SET ${leadSets.join(',')} WHERE id=?`,[...leadValues,leadId]);if(oppSets.length)await connection.execute(`UPDATE opportunities SET ${oppSets.join(',')} WHERE lead_id=?`,[...oppValues,leadId]);});
  if(assignedUserId&&assignedUserId!==String(current.assigned_user_id??''))await notifyCrm({leadId,agencyId,assignedUserId,actorUserId:request.user!.sub,subject:'Prospect réattribué',message:`Le prospect #${leadId} vous a été attribué.`});response.json(mapLead(await accessibleLead(leadId,request)));
}));

crmRouter.patch('/leads/:id/stage',authorize(...CRM_STAGE),asyncHandler(async(request,response)=>{
  const leadId=routeId(request.params.id);const current=await accessibleLead(leadId,request);const stage=text(request.body?.stage,'stage',30,true)!;if(!stages.includes(stage as typeof stages[number]))throw new HttpError(400,'Étape CRM invalide');const lostReason=text(request.body?.lostReason,'lostReason',255);if(stage==='lost'&&!lostReason)throw new HttpError(400,'Le motif de perte est obligatoire');
  await transaction(async connection=>{await connection.execute(`UPDATE opportunities SET stage=?,lost_reason=?,won_at=IF(?='won',NOW(),NULL),lost_at=IF(?='lost',NOW(),NULL) WHERE lead_id=?`,[stage,stage==='lost'?lostReason:null,stage,stage,leadId]);await connection.execute(`UPDATE leads SET status=?,converted_at=IF(?='converted',NOW(),NULL) WHERE id=?`,[stage==='won'?'converted':stage==='lost'?'lost':['new','contacted','qualified'].includes(stage)?stage:'qualified',stage==='won'?'converted':'',leadId]);});
  await notifyCrm({leadId,agencyId:current.agency_id==null?null:String(current.agency_id),assignedUserId:current.assigned_user_id==null?null:String(current.assigned_user_id),actorUserId:request.user!.sub,subject:'Étape CRM mise à jour',message:`Le prospect #${leadId} est maintenant à l’étape ${stage}.`});response.json(mapLead(await accessibleLead(leadId,request)));
}));

crmRouter.get('/leads/:id/activities',authorize(...CRM_READ),asyncHandler(async(request,response)=>{const leadId=routeId(request.params.id);await accessibleLead(leadId,request);const rows=await query<RowDataPacket[]>(`SELECT a.id,a.customer_id,a.lead_id,a.opportunity_id,a.assigned_user_id,a.type,a.subject,a.description,a.status,a.due_at,a.completed_at,a.created_at,CONCAT_WS(' ',u.first_name,u.last_name) assigned_user_name FROM activities a LEFT JOIN users u ON u.id=a.assigned_user_id WHERE a.lead_id=? ORDER BY a.created_at DESC LIMIT 200`,[leadId]);response.json(rows.map(row=>({id:String(row.id),customerId:row.customer_id==null?null:String(row.customer_id),leadId:String(row.lead_id),opportunityId:row.opportunity_id==null?null:String(row.opportunity_id),assignedUserId:row.assigned_user_id==null?null:String(row.assigned_user_id),assignedUserName:row.assigned_user_name??'',type:row.type,subject:row.subject,description:row.description??'',status:row.status,dueAt:row.due_at,completedAt:row.completed_at,createdAt:row.created_at})));}));

crmRouter.post('/activities',authorize(...CRM_WRITE),asyncHandler(async(request,response)=>{const body=request.body as Record<string,unknown>;const leadId=text(body.leadId,'leadId',30,true)!;const lead=await accessibleLead(leadId,request);const type=text(body.type,'type',30,true)!;if(!activityTypes.includes(type as typeof activityTypes[number]))throw new HttpError(400,"Type d'activité invalide");const status=text(body.status,'status',30)??'completed';if(!activityStatuses.includes(status as typeof activityStatuses[number]))throw new HttpError(400,"Statut d'activité invalide");const subject=text(body.subject,'subject',255,true)!;const description=text(body.description,'description',10000);const dueAt=body.dueAt==null||body.dueAt===''?null:new Date(String(body.dueAt));if(dueAt&&Number.isNaN(dueAt.getTime()))throw new HttpError(400,'dueAt est invalide');const result=await execute(`INSERT INTO activities(customer_id,lead_id,opportunity_id,assigned_user_id,type,subject,description,status,due_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?)`,[lead.customer_id??null,leadId,lead.opportunity_id,request.user!.sub,type,subject,description,status,dueAt,status==='completed'?new Date():null]);await notifyCrm({leadId,agencyId:lead.agency_id==null?null:String(lead.agency_id),assignedUserId:lead.assigned_user_id==null?null:String(lead.assigned_user_id),actorUserId:request.user!.sub,subject:'Nouvelle activité CRM',message:`${subject} a été ajouté au prospect #${leadId}.`});response.status(201).json({id:String(result.insertId)});}));
