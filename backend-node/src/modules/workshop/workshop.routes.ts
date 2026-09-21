import { Router, type Request } from "express";
import {assertFinanciallySettled} from "../billing/payment.domain.js";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, transaction } from "../../config/database.js";
import { unrestricted as legacyUnrestricted } from "../../middleware/authorize.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { assertAnyPermission, assertPermission } from "../rbac/rbac.service.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { emitToAgency, emitToUser } from "../../realtime/socket.js";
import { notifyPermissions as createPermissionNotifications } from "../notifications/notification.service.js";
import { HttpError } from "../../shared/http-error.js";
import { lockPartStock,lockPartStockById } from "../parts/part-stock.js";
import {getEffectiveBusinessSettings} from "../settings/setting-resolver.js";
import {effectiveLaborRates,resolveEffectiveLaborRateSelection} from "../settings/labor-rate.service.js";
import { nextDocumentNumber } from "../billing/document-sequence.js";
import {operationalCandidateSql} from '../users/operational-candidate.js';
import {renderRepairOrderDocument} from '../documents/commercial-document.js';
import {repairOrderFinancialSummary} from './repair-order-finance.js';
import {REPAIR_ORDER_IN_WORKSHOP_STATUSES} from './repair-order-status.js';
export const workshopRouter = Router();
type ServicePermission='service.order.view'|'service.order.create'|'service.order.update'|'service.order.assign_advisor'|'service.order.assign_technician'|'service.order.receive'|'service.order.diagnose'|'service.order.approve'|'service.order.advance'|'service.order.quality_control'|'service.order.ready'|'service.order.invoice'|'service.order.handover'|'service.order.close'|'service.order.cancel'|'service.order.abandon'|'service.documents.view'|'service.documents.manage';
type WorkshopPermission='workshop.view'|'workshop.plan'|'workshop.assign_technician'|'workshop.assign_bay'|'workshop.bay.view'|'workshop.bay.manage'|'workshop.schedule.view'|'workshop.schedule.manage'|'workshop.intervention.view'|'workshop.intervention.assign'|'workshop.intervention.update'|'workshop.session.view'|'workshop.session.track'|'workshop.session.manage'|'workshop.time.view'|'workshop.time.adjust'|'workshop.technicians.view'|'workshop.technicians.manage'|'workshop.resources.view'|'workshop.resources.manage'|'workshop.productivity.view';
const actionPermission=new WeakMap<Request,ServicePermission>();
const workshopActionPermission=new WeakMap<Request,WorkshopPermission>();
const workshopAuthorize=(permission:WorkshopPermission)=>{const middleware=requirePermission(permission);return(request:Request,response:any,next:(error?:unknown)=>void)=>{workshopActionPermission.set(request,permission);middleware(request,response,async(error?:unknown)=>{if(error)return next(error);try{if(permission==='workshop.plan'&&request.method==='DELETE'&&/^\/workshop\/schedules\/[1-9]\d*$/.test(request.path)){const[schedule]=await query<RowDataPacket[]>('SELECT status FROM schedules WHERE id=?',[idOf(request.params.id)]);if(schedule&&['completed','cancelled'].includes(schedule.status))throw new HttpError(409,'Affectation terminée ou annulée : consultation uniquement')}next()}catch(cause){next(cause)}})}};
const workshopAnyAccess=(permissions:WorkshopPermission[])=>asyncHandler(async(request,_response,next)=>{await assertAnyPermission(request,permissions);const selected=permissions.find(permission=>request.rbac?.isSuperAdmin||request.rbac?.permissions.has(permission))!;workshopActionPermission.set(request,selected);next();});
const workshopAssignmentAccess=asyncHandler(async(r,_res,next)=>{await assertPermission(r,'workshop.plan');await assertPermission(r,'workshop.assign_technician');if(r.body.bayId)await assertPermission(r,'workshop.assign_bay');if(/^\/repair-orders\/[1-9]\d*\/assign$/.test(r.path)){const[repairOrder]=await query<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=?',[idOf(r.params.id)]);if(!repairOrder)throw new HttpError(404,'Ordre de réparation introuvable');if(repairOrder.status!=='in_progress')throw new HttpError(409,"L’affectation atelier n’est disponible que pendant les travaux")}if(/^\/workshop\/schedules\/[1-9]\d*$/.test(r.path)){const[schedule]=await query<RowDataPacket[]>('SELECT status FROM schedules WHERE id=?',[idOf(r.params.id)]);if(schedule&&['completed','cancelled'].includes(schedule.status))throw new HttpError(409,'Affectation terminée ou annulée : consultation uniquement')}workshopActionPermission.set(r,'workshop.plan');next();});
const serviceAccess=(permission:ServicePermission)=>{const middleware=requirePermission(permission);return(request:Request,response:any,next:(error?:unknown)=>void)=>{actionPermission.set(request,permission);middleware(request,response,next)}};
const unrestricted=(request:Request)=>workshopActionPermission.has(request)?Boolean(request.rbac?.isSuperAdmin):legacyUnrestricted(request);
const flow = [
  "planned",
  "received",
  "diagnosis",
  "waiting_approval",
  "in_progress",
  "quality_control",
  "ready",
  "invoiced",
  "delivered",
  "closed",
  "abandonment_pending",
  "abandoned",
];
const normalTransitions:Record<string,string[]>={planned:['received'],received:['diagnosis'],diagnosis:['waiting_approval'],waiting_approval:['in_progress'],in_progress:['quality_control'],quality_control:['ready','in_progress'],delivered:['closed']};
const transitionPermissions:Record<string,ServicePermission>={
  'planned:received':'service.order.receive',
  'received:diagnosis':'service.order.diagnose',
  'diagnosis:waiting_approval':'service.order.diagnose',
  'waiting_approval:in_progress':'service.order.approve',
  'in_progress:quality_control':'service.order.quality_control',
  'quality_control:ready':'service.order.ready',
  'quality_control:in_progress':'service.order.advance',
  'delivered:closed':'service.order.close',
};
const idOf = (v: any) => {
  v = String(v ?? "");
  if (!/^[1-9]\d*$/.test(v)) throw new HttpError(400, "Identifiant invalide");
  return v;
};
const requestKey=(value:unknown)=>{if(value==null)return null;if(typeof value!=='string'||!/^[A-Za-z0-9_-]{8,64}$/.test(value))throw new HttpError(400,'Clé de requête invalide');return value};
const assertPhysicalInteger=(value:unknown,label='La quantité')=>{const quantity=Number(value);if(!Number.isFinite(quantity)||!Number.isInteger(quantity)||quantity<=0)throw new HttpError(400,`${label} doit être un nombre entier supérieur à zéro`);};
workshopRouter.use((request,_response,next)=>{try{if(request.method==='POST'&&/\/repair-orders\/[1-9]\d*\/estimate-items$/.test(request.path)&&request.body?.itemType==='part')assertPhysicalInteger(request.body?.quantity,'La quantité de pièce');if(request.method==='POST'&&/\/repair-orders\/[1-9]\d*\/parts\/reserve$/.test(request.path))assertPhysicalInteger(request.body?.quantity);if(request.method==='PATCH'&&/\/repair-orders\/[1-9]\d*\/parts\/reservations\/[1-9]\d*$/.test(request.path)&&request.body?.status==='consumed'&&request.body?.quantity!=null)assertPhysicalInteger(request.body.quantity,'La quantité consommée');next()}catch(error){next(error)}});
const advisorCandidateFrom = `FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles role ON role.id=ur.role_id AND role.is_active=TRUE JOIN role_permissions rp ON rp.role_id=role.id JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE WHERE u.is_active=TRUE AND p.code IN('service.order.receive','service.order.update') AND ${operationalCandidateSql('u')} AND (rp.scope='GLOBAL' OR rp.scope='CONCESSION' AND EXISTS(SELECT 1 FROM agencies candidate_agency JOIN agencies target_agency ON target_agency.concession_id=candidate_agency.concession_id WHERE candidate_agency.id=u.agency_id AND target_agency.id=?) OR rp.scope IN('OWN','AGENCY') AND u.agency_id=?)`;
// A technician remains attached to one agency (technicians.user_id is unique).
// The role permission, rather than the role name, determines operational eligibility.
const technicianCandidateFrom=`FROM users u LEFT JOIN technicians t ON t.user_id=u.id JOIN user_roles ur ON ur.user_id=u.id JOIN roles role ON role.id=ur.role_id AND role.is_active=TRUE JOIN role_permissions rp ON rp.role_id=role.id JOIN permissions p ON p.id=rp.permission_id AND p.code='workshop.session.track' AND p.is_active=TRUE WHERE u.is_active=TRUE AND u.agency_id=? AND ${operationalCandidateSql('u')} AND (rp.scope IN('GLOBAL','AGENCY','OWN') OR rp.scope='CONCESSION' AND EXISTS(SELECT 1 FROM agencies target WHERE target.id=? AND target.concession_id=(SELECT concession_id FROM agencies WHERE id=u.agency_id)))`;
async function eligibleTechnician(connection:PoolConnection,userId:string,agencyId:string){const[rows]=await connection.execute<RowDataPacket[]>(`SELECT u.id ${technicianCandidateFrom} AND u.id=? LIMIT 1`,[agencyId,agencyId,userId]);if(!rows[0])throw new HttpError(400,'Technicien inactif, hors périmètre ou sans permission de pointage')}
async function resolveRepairTechnician(connection:PoolConnection,value:unknown,agencyId:string){
  const raw=String(value??'');const virtual=/^u:([1-9]\d*)$/.exec(raw);
  if(virtual){await eligibleTechnician(connection,virtual[1]!,agencyId);await connection.execute('INSERT INTO technicians(user_id,agency_id) VALUES(?,?) ON DUPLICATE KEY UPDATE id=id',[virtual[1]!,agencyId]);const[rows]=await connection.execute<RowDataPacket[]>('SELECT id FROM technicians WHERE user_id=? AND agency_id=? AND is_active=TRUE',[virtual[1]!,agencyId]);if(!rows[0])throw new HttpError(400,'Fiche technicien inactive ou rattachée à une autre agence');return String(rows[0].id)}
  const id=idOf(raw);const[rows]=await connection.execute<RowDataPacket[]>(`SELECT t.id,t.user_id FROM technicians t JOIN users u ON u.id=t.user_id WHERE t.id=? AND t.agency_id=? AND t.is_active=TRUE AND ${operationalCandidateSql('u')}`,[id,agencyId]);if(!rows[0])throw new HttpError(400,'Technicien invalide pour cette agence');await eligibleTechnician(connection,String(rows[0].user_id),agencyId);return id;
}
async function assertRepairWarehouse(connection:PoolConnection,stock:RowDataPacket|{id:unknown},agencyId:string){
  const[rows]=await connection.execute<RowDataPacket[]>("SELECT l.id FROM part_stocks ps JOIN locations l ON l.id=ps.location_id WHERE ps.id=? AND ps.agency_id=? AND l.agency_id=? AND l.type='warehouse' AND l.is_active=TRUE",[String(stock.id),agencyId,agencyId]);
  if(!rows[0])throw new HttpError(400,'Emplacement de magasin inactif ou sans stock local valide');
}
async function assertAdvisorCandidate(connection:PoolConnection,userId:string,agencyId:string){
  const[rows]=await connection.execute<RowDataPacket[]>(`SELECT u.id ${advisorCandidateFrom} AND u.id=? LIMIT 1`,[agencyId,agencyId,userId]);
  if(!rows[0])throw new HttpError(400,'Conseiller SAV inactif, hors périmètre ou sans capacité fonctionnelle');
}
const txt = (v: any, n: string, max = 500, req = false) => {
  v = String(v ?? "").trim();
  if (req && !v) throw new HttpError(400, `${n} est requis`);
  if (v.length > max) throw new HttpError(400, `${n} est trop long`);
  return v || null;
};
const dateTime = (value: any, name: string) => {
  const raw=String(value??"").trim().replace("T"," ").replace(/Z$/,"");
  if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw)||Number.isNaN(Date.parse(raw.replace(" ","T")))) throw new HttpError(400,`${name} invalide`);
  return raw.length===16?`${raw}:00`:raw;
};
const isoDate=(value:any,name:string)=>{const raw=String(value??"");if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||Number.isNaN(Date.parse(`${raw}T00:00:00`)))throw new HttpError(400,`${name} invalide`);return raw;};
const ensureWritable=(ro:any,allowed?:string[])=>{if(['quality_control','ready','invoiced','delivered','closed','cancelled','abandonment_pending','abandoned'].includes(ro.status))throw new HttpError(409,`OR ${ro.status}: modification interdite`);if(allowed&&!allowed.includes(ro.status))throw new HttpError(409,`Action interdite au statut ${ro.status}`);};
async function completeInterventionSchedules(connection:PoolConnection,interventionId:string,changedBy:string){
  const[activeSessions]=await connection.execute<RowDataPacket[]>("SELECT id FROM work_sessions WHERE intervention_id=? AND status IN('running','paused') LIMIT 1 FOR UPDATE",[interventionId]);
  if(activeSessions[0])throw new HttpError(409,'Une session est encore active');
  const[schedules]=await connection.execute<RowDataPacket[]>("SELECT s.* FROM schedules s JOIN interventions i ON i.id=s.intervention_id AND i.repair_order_id=s.repair_order_id WHERE s.intervention_id=? AND (s.technician_id IS NULL OR s.technician_id=i.technician_id) AND s.status IN('planned','confirmed','in_progress') FOR UPDATE",[interventionId]);
  for(const schedule of schedules){
    await connection.execute("UPDATE schedules SET status='completed' WHERE id=?",[schedule.id]);
    await connection.execute("INSERT INTO workshop_schedule_history(schedule_id,action,old_values,new_values,changed_by)VALUES(?,'updated',?,JSON_OBJECT('status','completed'),?)",[schedule.id,JSON.stringify(schedule),changedBy]);
  }
  return schedules.map(schedule=>String(schedule.id));
}
const workshopScope=(r:Request,a='s')=>{const permission=r.rbac?.isSuperAdmin?'GLOBAL':r.rbac?.permissions.get(workshopActionPermission.get(r)??'workshop.view');if(permission==='GLOBAL')return{sql:'1=1',p:[]};if(permission==='CONCESSION')return{sql:`${a}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`,p:[r.user!.agencyId]};if(permission==='AGENCY')return{sql:`${a}.agency_id=?`,p:[r.user!.agencyId]};if(permission==='OWN')return{sql:`EXISTS(SELECT 1 FROM technicians own_t WHERE own_t.id=${a}.technician_id AND own_t.user_id=?)`,p:[r.user!.sub]};throw new HttpError(403,'Périmètre atelier insuffisant.');};
const workshopInterventionScope=(r:Request)=>{const permission=r.rbac?.isSuperAdmin?'GLOBAL':r.rbac?.permissions.get(workshopActionPermission.get(r)??'workshop.intervention.view');if(permission==='GLOBAL')return{sql:'1=1',p:[]};if(permission==='CONCESSION')return{sql:'ro.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))',p:[r.user!.agencyId]};if(permission==='AGENCY')return{sql:'ro.agency_id=?',p:[r.user!.agencyId]};if(permission==='OWN')return{sql:'EXISTS(SELECT 1 FROM technicians own_t WHERE own_t.id=i.technician_id AND own_t.user_id=?)',p:[r.user!.sub]};throw new HttpError(403,'Périmètre interventions insuffisant.');};
const workshopAgencyScope=(r:Request,a:string)=>{const permission=r.rbac?.isSuperAdmin?'GLOBAL':r.rbac?.permissions.get(workshopActionPermission.get(r)??'workshop.view');if(permission==='GLOBAL')return{sql:'1=1',p:[]};if(permission==='CONCESSION')return{sql:`${a}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`,p:[r.user!.agencyId]};if(permission==='AGENCY')return{sql:`${a}.agency_id=?`,p:[r.user!.agencyId]};if(permission==='OWN')throw new HttpError(403,'Le périmètre OWN ne couvre pas les ressources collectives Atelier');throw new HttpError(403,'Périmètre Atelier insuffisant');};
const agencyFromQuery=(r:Request)=>unrestricted(r)&&r.query.agencyId?idOf(r.query.agencyId):r.user!.agencyId!;
const workshopAgencyFromQuery=(r:Request)=>r.rbac?.isSuperAdmin&&r.query.agencyId?idOf(r.query.agencyId):r.user!.agencyId!;
const workshopOwnTechnician=(r:Request,userId:string)=>r.rbac?.permissions.get(workshopActionPermission.get(r)??'workshop.session.track')==='OWN'&&userId!==r.user!.sub;
const workshopSupervisionOwnForbidden=(r:Request)=>r.rbac?.permissions.get(workshopActionPermission.get(r)??'workshop.view')==='OWN';
async function assertWorkshopAgencyScope(r:Request,agencyId:string){const permission=workshopActionPermission.get(r)??'workshop.view';if(r.rbac?.isSuperAdmin)return;const granted=r.rbac?.permissions.get(permission);if(granted==='GLOBAL')return;if(granted==='AGENCY'&&String(r.user!.agencyId)===agencyId)return;if(granted==='CONCESSION'){const [match]=await query<RowDataPacket[]>('SELECT target.id FROM agencies target JOIN agencies actor ON actor.concession_id=target.concession_id WHERE actor.id=? AND target.id=?',[r.user!.agencyId,agencyId]);if(match)return;}throw new HttpError(403,'Périmètre Atelier insuffisant');}
const permissionScope=(r:Request,permission:WorkshopPermission)=>r.rbac?.isSuperAdmin?'GLOBAL':r.rbac?.permissions.get(permission);
const productivityFilters=(r:Request)=>{
  const granted=permissionScope(r,'workshop.productivity.view');
  if(granted==='GLOBAL')return{technician:{sql:'1=1',p:[]},schedule:{sql:'1=1',p:[]},bay:{sql:'1=1',p:[]},personal:false};
  if(granted==='CONCESSION'){const clause=(alias:string)=>`${alias}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`;return{technician:{sql:clause('t'),p:[r.user!.agencyId]},schedule:{sql:clause('s'),p:[r.user!.agencyId]},bay:{sql:clause('b'),p:[r.user!.agencyId]},personal:false};}
  if(granted==='AGENCY')return{technician:{sql:'t.agency_id=?',p:[r.user!.agencyId]},schedule:{sql:'s.agency_id=?',p:[r.user!.agencyId]},bay:{sql:'b.agency_id=?',p:[r.user!.agencyId]},personal:false};
  if(granted==='OWN')return{technician:{sql:'t.user_id=?',p:[r.user!.sub]},schedule:{sql:'EXISTS(SELECT 1 FROM technicians own_t WHERE own_t.id=s.technician_id AND own_t.user_id=?)',p:[r.user!.sub]},bay:{sql:'1=0',p:[]},personal:true};
  throw new HttpError(403,'Périmètre productivité insuffisant');
};
workshopRouter.get('/workshop/config',workshopAuthorize('workshop.view'),asyncHandler(async(r,res)=>{const agencyId=workshopAgencyFromQuery(r),config=await getEffectiveBusinessSettings(agencyId);res.json({vatRate:config.vatRate,rates:await effectiveLaborRates(agencyId),currencyCode:config.currencyCode})}));
const scope=(r:Request,a='ro')=>{const permissionCode=actionPermission.get(r)??'service.order.view',permission=r.rbac?.isSuperAdmin?'GLOBAL':r.rbac?.permissions.get(permissionCode);if(permission==='GLOBAL')return{sql:'1=1',p:[]};if(permission==='CONCESSION')return{sql:`${a}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`,p:[r.user!.agencyId]};if(permission==='AGENCY')return{sql:`${a}.agency_id=?`,p:[r.user!.agencyId]};if(permission==='OWN'){if(permissionCode==='service.order.advance')return{sql:`(${a}.advisor_id=? OR EXISTS(SELECT 1 FROM interventions own_i JOIN technicians own_t ON own_t.id=own_i.technician_id WHERE own_i.repair_order_id=${a}.id AND own_t.user_id=?))`,p:[r.user!.sub,r.user!.sub]};return{sql:`${a}.advisor_id=?`,p:[r.user!.sub]};}throw new HttpError(403,'Périmètre SAV insuffisant.');};
const requireTransitionPermission=asyncHandler(async(r,_res,next)=>{
  const id=idOf(r.params.id),nextStatus=txt(r.body.status,'Statut',40,true)!;
  const [current]=await query<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=?',[id]);
  if(!current)throw new HttpError(404,'Ordre de réparation introuvable');
  const permission=nextStatus==='cancelled'?'service.order.cancel':transitionPermissions[`${current.status}:${nextStatus}`];
  if(!permission)throw new HttpError(409,`Transition ${current.status} → ${nextStatus} interdite`);
  await assertPermission(r,permission);actionPermission.set(r,permission);next();
});
async function permissionCoversAgency(r:Request,permission:string,agencyId:string){
  if(r.rbac?.isSuperAdmin)return true;
  const permissionScope=r.rbac?.permissions.get(permission);
  if(permissionScope==='GLOBAL')return true;
  if(permissionScope==='OWN')return permission.startsWith('parts.')?false:String(r.user!.agencyId)===agencyId;
  if(permissionScope==='AGENCY')return String(r.user!.agencyId)===agencyId;
  if(permissionScope==='CONCESSION'){
    const [match]=await query<RowDataPacket[]>('SELECT target.id FROM agencies target JOIN agencies actor ON actor.concession_id=target.concession_id WHERE actor.id=? AND target.id=?',[r.user!.agencyId,agencyId]);
    return Boolean(match);
  }
  return false;
}
const serviceCustomerScope=(r:Request,alias='c')=>{
  const granted=r.rbac?.isSuperAdmin?'GLOBAL':r.rbac?.permissions.get('service.order.create');
  if(granted==='GLOBAL')return{sql:'1=1',params:[] as string[]};
  if(granted==='CONCESSION')return{sql:`${alias}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`,params:[String(r.user!.agencyId)]};
  if(granted==='AGENCY')return{sql:`${alias}.agency_id=?`,params:[String(r.user!.agencyId)]};
  if(granted==='OWN')return{sql:`${alias}.agency_id=? AND ${alias}.assigned_user_id=?`,params:[String(r.user!.agencyId),r.user!.sub]};
  throw new HttpError(403,'Périmètre SAV insuffisant');
};
async function serviceCustomerAgency(r:Request,customerId:string){
  const scoped=serviceCustomerScope(r);
  const [customer]=await query<RowDataPacket[]>(`SELECT c.agency_id FROM customers c WHERE c.id=? AND ${scoped.sql}`,[customerId,...scoped.params]);
  if(!customer)throw new HttpError(403,'Client hors périmètre SAV');
  return String(customer.agency_id);
}
const requirePartsStockAccess=asyncHandler(async(r,_res,next)=>{
  let isPart=String(r.body.itemType??'')==='part';
  if(r.params.itemId){const [item]=await query<RowDataPacket[]>('SELECT roi.item_type,ro.status repair_order_status FROM repair_order_items roi JOIN repair_orders ro ON ro.id=roi.repair_order_id WHERE roi.id=? AND roi.repair_order_id=?',[idOf(r.params.itemId),idOf(r.params.id)]);if(!item)throw new HttpError(404,'Ligne OR introuvable');if(item.repair_order_status!=='in_progress')throw new HttpError(409,"Les lignes facturables ne sont modifiables que pendant les travaux");isPart=item.item_type==='part';}
  if(!isPart)return next();
  await assertPermission(r,'parts.stock.adjust');
  const [repairOrder]=await query<RowDataPacket[]>('SELECT agency_id FROM repair_orders WHERE id=?',[idOf(r.params.id)]);
  if(!repairOrder||!await permissionCoversAgency(r,'parts.stock.adjust',String(repairOrder.agency_id)))throw new HttpError(403,'Périmètre Parts insuffisant pour cette agence');
  next();
});
const select = `SELECT ro.*,a.name agency_name,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,c.phone customer_phone,v.vin,v.registration_number,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,CONCAT_WS(' ',u.first_name,u.last_name) advisor_name FROM repair_orders ro JOIN agencies a ON a.id=ro.agency_id JOIN customers c ON c.id=ro.customer_id JOIN vehicles v ON v.id=ro.vehicle_id JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id LEFT JOIN users u ON u.id=ro.advisor_id`;
async function one(id: string, r: Request): Promise<any> {
  const s = scope(r),
    [x] = await query<RowDataPacket[]>(`${select} WHERE ro.id=? AND ${s.sql}`, [
      id,
      ...s.p,
    ]);
  if (!x) throw new HttpError(404, "Ordre de réparation introuvable");
  return x;
}
async function detail(id: string, r: Request): Promise<any> {
  const ro = await one(id, r);
  const mayViewReservations=await permissionCoversAgency(r,'parts.reservation.view',String(ro.agency_id));
  const [
    items,
    schedules,
    diagnostics,
    interventions,
    inspection,
    approvals,
    history,
    sessions,
    reservations,
    qualityControls,
    handovers,
    invoiceBalance,
    financialRows,
    estimateItems,
    estimateRows,
  ] = await Promise.all([
    query<RowDataPacket[]>(
      "SELECT i.*,p.reference part_reference FROM repair_order_items i LEFT JOIN parts p ON p.id=i.part_id WHERE i.repair_order_id=?",
      [id],
    ),
    query<RowDataPacket[]>(
      `SELECT s.*,CONCAT_WS(' ',u.first_name,u.last_name) technician_name,b.name bay_name FROM schedules s LEFT JOIN technicians t ON t.id=s.technician_id LEFT JOIN users u ON u.id=t.user_id LEFT JOIN workshop_bays b ON b.id=s.bay_id WHERE s.repair_order_id=?`,
      [id],
    ),
    query<RowDataPacket[]>(
      "SELECT d.*,CONCAT_WS(' ',u.first_name,u.last_name) technician_name FROM diagnostics d LEFT JOIN technicians t ON t.id=d.technician_id LEFT JOIN users u ON u.id=t.user_id WHERE d.repair_order_id=? ORDER BY d.diagnosed_at DESC",
      [id],
    ),
    query<RowDataPacket[]>(
      `SELECT i.*,CONCAT_WS(' ',u.first_name,u.last_name) technician_name FROM interventions i LEFT JOIN technicians t ON t.id=i.technician_id LEFT JOIN users u ON u.id=t.user_id WHERE i.repair_order_id=? ORDER BY i.id`,
      [id],
    ),
    query<RowDataPacket[]>(
      "SELECT * FROM vehicle_reception_inspections WHERE repair_order_id=?",
      [id],
    ),
    query<RowDataPacket[]>(
      "SELECT a.*,CONCAT_WS(' ',u.first_name,u.last_name) recorded_by_name FROM repair_approvals a LEFT JOIN users u ON u.id=a.recorded_by WHERE a.repair_order_id=? ORDER BY a.recorded_at DESC",
      [id],
    ),
    query<RowDataPacket[]>(
      "SELECT h.*,CONCAT_WS(' ',u.first_name,u.last_name) changed_by_name FROM repair_order_status_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.repair_order_id=? ORDER BY h.changed_at DESC",
      [id],
    ),
    query<RowDataPacket[]>(
      "SELECT ws.*,CONCAT_WS(' ',u.first_name,u.last_name) technician_name FROM work_sessions ws JOIN technicians t ON t.id=ws.technician_id JOIN users u ON u.id=t.user_id WHERE ws.repair_order_id=? ORDER BY ws.started_at DESC",
      [id],
    ),
    mayViewReservations?query<RowDataPacket[]>("SELECT pr.*,p.reference part_reference,p.name part_name,l.name location_name FROM part_reservations pr JOIN parts p ON p.id=pr.part_id LEFT JOIN locations l ON l.id=pr.location_id WHERE pr.repair_order_id=? ORDER BY pr.created_at DESC",[id]):Promise.resolve([]),
    query<RowDataPacket[]>("SELECT qc.*,CONCAT_WS(' ',u.first_name,u.last_name) controlled_by_name FROM repair_quality_controls qc LEFT JOIN users u ON u.id=qc.controlled_by WHERE qc.repair_order_id=? ORDER BY qc.controlled_at DESC",[id]),
    query<RowDataPacket[]>("SELECT h.*,CONCAT_WS(' ',u.first_name,u.last_name) handed_over_by_name FROM repair_order_handovers h LEFT JOIN users u ON u.id=h.handed_over_by WHERE h.repair_order_id=?",[id]),
    query<RowDataPacket[]>("SELECT id,invoice_number,status,balance_due FROM invoices WHERE repair_order_id=? AND status<>'cancelled' ORDER BY id DESC",[id]),
    query<RowDataPacket[]>("SELECT item_type,COALESCE(SUM(quantity*unit_price),0) gross,COALESCE(SUM(discount),0) discount,COALESCE(SUM(line_total),0) subtotal,COALESCE(SUM(line_total*tax_rate/100),0) tax FROM repair_order_items WHERE repair_order_id=? AND status='active' GROUP BY item_type",[id]),
    query<RowDataPacket[]>("SELECT e.*,p.reference part_reference,i.id intervention_id,i.technician_id intervention_technician_id,i.status intervention_status,i.actual_hours,pr.id reservation_id,pr.quantity reserved_quantity,pr.consumed_quantity,pr.status reservation_status,roi.id actual_item_id,roi.quantity actual_quantity FROM repair_order_estimate_items e LEFT JOIN parts p ON p.id=e.part_id LEFT JOIN interventions i ON i.estimate_item_id=e.id LEFT JOIN part_reservations pr ON pr.estimate_item_id=e.id LEFT JOIN repair_order_items roi ON roi.estimate_item_id=e.id AND roi.status='active' WHERE e.repair_order_id=? ORDER BY e.id",[id]),
    query<RowDataPacket[]>("SELECT item_type,COALESCE(SUM(quantity*unit_price),0) gross,COALESCE(SUM(discount),0) discount,COALESCE(SUM(line_total),0) subtotal,COALESCE(SUM(line_total*tax_rate/100),0) tax FROM repair_order_estimate_items WHERE repair_order_id=? GROUP BY item_type",[id]),
  ]);
  const mayViewInvoice=await permissionCoversAgency(r,'billing.invoice.view',String(ro.agency_id)),mayViewPayments=await permissionCoversAgency(r,'billing.payment.view',String(ro.agency_id)),mayCollectPayment=await permissionCoversAgency(r,'billing.payment.collect',String(ro.agency_id)),mayAccessInvoice=mayViewInvoice||mayViewPayments||mayCollectPayment;
  const invoices=mayAccessInvoice?await query<RowDataPacket[]>("SELECT id,invoice_number,status,subtotal,tax_total,total,amount_paid,balance_due,issue_date FROM invoices WHERE repair_order_id=? AND status<>'cancelled' ORDER BY id DESC",[id]):[];
  const visibleInvoice=invoices[0]?(mayViewPayments||mayCollectPayment?invoices[0]:{...invoices[0],amount_paid:null,balance_due:null}):null;
  const businessConfig=await getEffectiveBusinessSettings(String(ro.agency_id));
  const financialSummary=repairOrderFinancialSummary(financialRows as any,businessConfig.currencyCode);
  const estimateSummary=repairOrderFinancialSummary(estimateRows as any,businessConfig.currencyCode);
  return {
    ...ro,
    items,
    schedules,
    diagnostics,
    interventions,
    inspection: inspection[0] ?? null,
    approvals,
    history,
    sessions,
    reservations,
    qualityControls,
    handover: handovers[0]??null,
    invoice:visibleInvoice,
    financialSummary,
    estimateItems,
    estimateSummary,
    financially_cleared:invoiceBalance[0]?Number(invoiceBalance[0].balance_due)<=0:false,
  };
}
async function notify(
  agency: string,
  subject: string,
  message: string,
  id: string,
) {
  await createPermissionNotifications({agencyId:agency,permissions:['service.order.view'],subject,message,eventType:'workshop.status_changed',referenceType:'repair_order',referenceId:id,priority:'normal'});
}
async function abandonmentImpact(connection:PoolConnection,id:string){
  const [[sessions],[interventions],[time],[reservations],[schedules],[items],[invoice]]=await Promise.all([
    connection.execute<RowDataPacket[]>("SELECT COUNT(*) active_sessions FROM work_sessions WHERE repair_order_id=? AND status IN('running','paused')",[id]),
    connection.execute<RowDataPacket[]>("SELECT SUM(status='completed') completed_interventions,SUM(status<>'completed' AND status<>'cancelled') open_interventions FROM interventions WHERE repair_order_id=?",[id]),
    connection.execute<RowDataPacket[]>("SELECT COALESCE(SUM(hours),0) actual_hours FROM time_entries WHERE repair_order_id=?",[id]),
    connection.execute<RowDataPacket[]>("SELECT COALESCE(SUM(consumed_quantity),0) consumed_parts,COALESCE(SUM(CASE WHEN status='reserved' THEN quantity-consumed_quantity ELSE 0 END),0) reserved_parts FROM part_reservations WHERE repair_order_id=?",[id]),
    connection.execute<RowDataPacket[]>("SELECT COUNT(*) active_schedules FROM schedules WHERE repair_order_id=? AND status IN('planned','confirmed','in_progress')",[id]),
    connection.execute<RowDataPacket[]>("SELECT COALESCE(SUM(CASE WHEN status='active' THEN line_total*(1+tax_rate/100) ELSE 0 END),0) actual_items_total FROM repair_order_items WHERE repair_order_id=?",[id]),
    connection.execute<RowDataPacket[]>(`SELECT i.id,i.invoice_number,i.status,i.total,i.amount_paid,i.balance_due,i.total-COALESCE((SELECT SUM(cn.amount) FROM credit_notes cn WHERE cn.invoice_id=i.id AND cn.status IN('issued','applied')),0) net_invoiced FROM invoices i WHERE i.repair_order_id=? AND i.status<>'cancelled' ORDER BY i.id DESC LIMIT 1`,[id]),
  ]);
  return{activeSessions:Number(sessions[0]?.active_sessions??0),completedInterventions:Number(interventions[0]?.completed_interventions??0),openInterventions:Number(interventions[0]?.open_interventions??0),actualHours:Number(time[0]?.actual_hours??0),consumedParts:Number(reservations[0]?.consumed_parts??0),reservedParts:Number(reservations[0]?.reserved_parts??0),activeSchedules:Number(schedules[0]?.active_schedules??0),actualItemsTotal:Number(items[0]?.actual_items_total??0),invoice:invoice[0]?{id:String(invoice[0].id),invoiceNumber:invoice[0].invoice_number,status:invoice[0].status,total:Number(invoice[0].total),netInvoiced:Number(invoice[0].net_invoiced),netCollected:Number(invoice[0].amount_paid),balanceDue:Number(invoice[0].balance_due)}:null};
}
async function cleanupAbandonment(connection:PoolConnection,id:string,agencyId:string,userId:string){
  const[schedules]=await connection.execute<RowDataPacket[]>("SELECT * FROM schedules WHERE repair_order_id=? AND status IN('planned','confirmed','in_progress') FOR UPDATE",[id]);
  for(const schedule of schedules){await connection.execute("UPDATE schedules SET status='cancelled' WHERE id=?",[schedule.id]);await connection.execute("INSERT INTO workshop_schedule_history(schedule_id,action,old_values,new_values,changed_by)VALUES(?,'cancelled',?,JSON_OBJECT('status','cancelled'),?)",[schedule.id,JSON.stringify(schedule),userId]);}
  await connection.execute("UPDATE interventions SET status='cancelled' WHERE repair_order_id=? AND status IN('planned','assigned','in_progress')",[id]);
  const[reservations]=await connection.execute<RowDataPacket[]>("SELECT * FROM part_reservations WHERE repair_order_id=? AND status='reserved' FOR UPDATE",[id]);
  for(const reservation of reservations){const remaining=Number(reservation.quantity)-Number(reservation.consumed_quantity??0);if(remaining<=0)continue;const[stocks]=await connection.execute<RowDataPacket[]>('SELECT * FROM part_stocks WHERE id=? AND part_id=? AND agency_id=? FOR UPDATE',[reservation.part_stock_id,reservation.part_id,agencyId]);if(!stocks[0]||Number(stocks[0].reserved_stock)<remaining)throw new HttpError(409,'Cohérence du stock réservé invalide');await connection.execute('UPDATE part_stocks SET reserved_stock=reserved_stock-? WHERE id=?',[remaining,reservation.part_stock_id]);await connection.execute("UPDATE part_reservations SET status='released' WHERE id=?",[reservation.id]);await connection.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'release',?,'repair_order',?,'Libération arrêt OR',?)",[reservation.part_id,agencyId,reservation.location_id,remaining,id,userId]);}
  return schedules.map(x=>String(x.id));
}
workshopRouter.get('/repair-orders/:id/technician-candidates',serviceAccess('service.order.view'),asyncHandler(async(r,res)=>{
  const ro=await one(idOf(r.params.id),r);
  const rows=await query<RowDataPacket[]>(`SELECT DISTINCT u.id user_id,u.agency_id,CONCAT_WS(' ',u.first_name,u.last_name) name,t.id technician_id ${technicianCandidateFrom} AND (t.id IS NULL OR t.agency_id=? AND t.is_active=TRUE) ORDER BY name`,[ro.agency_id,ro.agency_id,ro.agency_id]);
  res.json(rows.map(row=>({id:row.technician_id?String(row.technician_id):`u:${row.user_id}`,userId:String(row.user_id),agencyId:String(row.agency_id),name:row.name})));
}));
workshopRouter.get('/repair-orders/:id/labor-rates',serviceAccess('service.order.view'),asyncHandler(async(r,res)=>{
  const ro=await one(idOf(r.params.id),r),config=await getEffectiveBusinessSettings(String(ro.agency_id));res.json({rates:await effectiveLaborRates(String(ro.agency_id)),currencyCode:config.currencyCode});
}));
workshopRouter.get('/repair-orders/:id/available-parts',serviceAccess('service.order.view'),asyncHandler(async(r,res)=>{
  const ro=await one(idOf(r.params.id),r);await assertAnyPermission(r,['parts.reservation.view','parts.reservation.create']);const partPermission=r.rbac?.permissions.has('parts.reservation.view')?'parts.reservation.view':'parts.reservation.create';if(!await permissionCoversAgency(r,partPermission,String(ro.agency_id)))throw new HttpError(403,'Périmètre Pièces insuffisant');
  const rows=await query<RowDataPacket[]>("SELECT p.id,p.reference,p.name,p.sale_price,COALESCE(SUM(ps.current_stock-ps.reserved_stock),0) available_stock FROM parts p JOIN part_stocks ps ON ps.part_id=p.id AND ps.agency_id=? JOIN locations l ON l.id=ps.location_id AND l.agency_id=ps.agency_id AND l.type='warehouse' AND l.is_active=TRUE WHERE p.is_active=TRUE AND ps.current_stock>ps.reserved_stock GROUP BY p.id ORDER BY p.reference",[ro.agency_id]);
  res.json(rows.map(row=>({id:String(row.id),reference:row.reference,name:row.name,salePrice:Number(row.sale_price),availableStock:Number(row.available_stock)})));
}));
workshopRouter.get('/repair-orders/:id/available-parts/:partId/stocks',serviceAccess('service.order.view'),asyncHandler(async(r,res)=>{
  const ro=await one(idOf(r.params.id),r);await assertPermission(r,'parts.reservation.create');if(!await permissionCoversAgency(r,'parts.reservation.create',String(ro.agency_id)))throw new HttpError(403,'Périmètre Pièces insuffisant');
  const rows=await query<RowDataPacket[]>("SELECT ps.id,l.id location_id,l.name location_name,ps.current_stock-ps.reserved_stock available_stock FROM part_stocks ps JOIN locations l ON l.id=ps.location_id AND l.agency_id=ps.agency_id AND l.type='warehouse' AND l.is_active=TRUE WHERE ps.part_id=? AND ps.agency_id=? AND ps.current_stock>ps.reserved_stock ORDER BY l.name",[idOf(r.params.partId),ro.agency_id]);
  res.json(rows.map(row=>({id:String(row.id),locationId:String(row.location_id),locationName:row.location_name,availableStock:Number(row.available_stock)})));
}));
workshopRouter.get('/repair-orders/advisor-candidates',serviceAccess('service.order.create'),asyncHandler(async(r,res)=>{
  const agency=idOf(r.query.targetAgency??r.user!.agencyId);
  if(!await permissionCoversAgency(r,'service.order.create',agency))throw new HttpError(403,'Périmètre SAV insuffisant');
  const rows=await query<RowDataPacket[]>(`SELECT DISTINCT u.id,CONCAT_WS(' ',u.first_name,u.last_name) name ${advisorCandidateFrom} ORDER BY name`,[agency,agency]);
  const assignScope=r.rbac?.isSuperAdmin?'GLOBAL':r.rbac?.permissions.get('service.order.assign_advisor');
  const mayAssign=assignScope&&assignScope!=='OWN'&&await permissionCoversAgency(r,'service.order.assign_advisor',agency);
  res.json(rows.filter(row=>mayAssign||String(row.id)===r.user!.sub).map(row=>({id:String(row.id),name:row.name})));
}));
workshopRouter.get('/repair-orders/customer-candidates',serviceAccess('service.order.create'),asyncHandler(async(r,res)=>{
  const scoped=serviceCustomerScope(r);
  const rows=await query<RowDataPacket[]>(`SELECT c.id,c.customer_code,c.civility,c.first_name,c.last_name,c.company_name,c.phone,c.agency_id FROM customers c WHERE ${scoped.sql} ORDER BY c.last_name,c.first_name,c.id`,scoped.params);
  res.json(rows.map(row=>({id:String(row.id),code:row.customer_code,civility:row.civility,firstName:row.first_name??'',lastName:row.last_name??'',companyName:row.company_name??'',phone:row.phone??'',agencyId:String(row.agency_id)})));
}));
workshopRouter.get('/repair-orders/customer-vehicles',serviceAccess('service.order.create'),asyncHandler(async(r,res)=>{
  const customer=idOf(r.query.customerId);
  const agency=await serviceCustomerAgency(r,customer);
  const rows=await query<RowDataPacket[]>(`SELECT DISTINCT v.id,v.vin,v.registration_number,CONCAT(b.name,' ',m.name,' ',ve.name) label FROM vehicles v JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id WHERE v.agency_id=? AND (EXISTS(SELECT 1 FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.vehicle_id=v.id AND s.customer_id=?) OR EXISTS(SELECT 1 FROM repair_orders ro WHERE ro.vehicle_id=v.id AND ro.customer_id=?)) ORDER BY label`,[agency,customer,customer]);
  res.json(rows.map(row=>({id:String(row.id),vin:row.vin,registrationNumber:row.registration_number,label:row.label})));
}));
workshopRouter.get(
  "/repair-orders",
  serviceAccess('service.order.view'),
  asyncHandler(async (r, res) => {
    const s = scope(r),
      where = [s.sql],
      p: any[] = [...s.p];
    if (r.query.status) {
      where.push("ro.status=?");
      p.push(r.query.status);
    }
    if (r.query.search) {
      const t = `%${r.query.search}%`;
      where.push(
        "(ro.order_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR v.vin LIKE ? OR v.registration_number LIKE ?)",
      );
      p.push(t, t, t, t, t);
    }
    res.json(
      await query<RowDataPacket[]>(
        `${select} WHERE ${where.join(" AND ")} ORDER BY ro.created_at DESC`,
        p,
      ),
    );
  }),
);
workshopRouter.get(
  "/repair-orders/stats",
  serviceAccess('service.order.view'),
  asyncHandler(async (r, res) => {
    const s = scope(r);
    const [x] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) total,SUM(status IN(${REPAIR_ORDER_IN_WORKSHOP_STATUSES.map(()=>'?').join(',')})) in_workshop,SUM(status='in_progress') in_progress,SUM(warranty_covered) warranty,COALESCE(SUM(actual_total),0) revenue FROM repair_orders ro WHERE ${s.sql}`,
      [...REPAIR_ORDER_IN_WORKSHOP_STATUSES,...s.p],
    );
    const [b] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) total,SUM(status='occupied') occupied FROM workshop_bays WHERE ${unrestricted(r) ? "1=1" : "agency_id=?"}`,
      unrestricted(r) ? [] : [r.user!.agencyId],
    );
    res.json({
      ...x,
      inWorkshop: Number(x?.in_workshop??0),
      baysTotal: b?.total ?? 0,
      baysOccupied: b?.occupied ?? 0,
    });
  }),
);
workshopRouter.get(
  "/repair-orders/:id",
  serviceAccess('service.order.view'),
  asyncHandler(async (r, res) => res.json(await detail(idOf(r.params.id), r))),
);
workshopRouter.get('/repair-orders/:id/abandonment-impact',serviceAccess('service.order.abandon'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),ro=await one(id,r),impact=await transaction(c=>abandonmentImpact(c,id));res.json({repairOrderId:id,status:ro.status,...impact});}));
workshopRouter.post('/repair-orders/:id/abandonment',serviceAccess('service.order.abandon'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),ro=await one(id,r),reasonCode=txt(r.body.reasonCode,'Code motif',50,true)!,reason=txt(r.body.reason,'Motif',500,true)!;const impact=await transaction(async c=>{const[rows]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_orders WHERE id=? FOR UPDATE',[id]),locked=rows[0];if(!locked)throw new HttpError(404,'Ordre de réparation introuvable');if(locked.status==='abandonment_pending')return abandonmentImpact(c,id);if(!['planned','received','diagnosis','waiting_approval','in_progress','quality_control','ready','invoiced'].includes(String(locked.status)))throw new HttpError(409,`Abandon interdit au statut ${locked.status}`);await c.execute("UPDATE repair_orders SET status='abandonment_pending',abandonment_reason_code=?,abandonment_reason=?,abandonment_requested_at=NOW(),abandonment_requested_by=? WHERE id=?",[reasonCode,reason,r.user!.sub,id]);await c.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,?,'abandonment_pending',?,?)",[id,locked.status,`${reasonCode}: ${reason}`,r.user!.sub]);return abandonmentImpact(c,id)});emitToAgency(String(ro.agency_id),'workshop:status',{id,repairOrderId:id,agencyId:String(ro.agency_id),status:'abandonment_pending'});await notify(String(ro.agency_id),'Abandon client demandé',`${ro.order_number}: ${reason}`,id);res.status(201).json({repairOrderId:id,status:'abandonment_pending',...impact});}));
workshopRouter.post('/repair-orders/:id/abandonment/finalize',serviceAccess('service.order.abandon'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),ro=await one(id,r);const scheduleIds=await transaction(async c=>{const[rows]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_orders WHERE id=? FOR UPDATE',[id]),locked=rows[0];if(!locked)throw new HttpError(404,'Ordre de réparation introuvable');if(locked.status==='abandoned')return[];if(locked.status!=='abandonment_pending')throw new HttpError(409,"L'OR n'est pas en abandon en cours");const before=await abandonmentImpact(c,id);if(before.activeSessions)throw new HttpError(409,'Arrêtez toutes les sessions avant de finaliser');const ids=await cleanupAbandonment(c,id,String(locked.agency_id),r.user!.sub),after=await abandonmentImpact(c,id);if(after.activeSchedules||after.reservedParts)throw new HttpError(409,'Le nettoyage opérationnel est incomplet');if(after.invoice){if(after.invoice.balanceDue>.001||after.invoice.netCollected-after.invoice.netInvoiced>.001)throw new HttpError(409,'Régularisez la situation financière avant de finaliser');}else if(after.actualItemsTotal>.001)throw new HttpError(409,'Les travaux ou pièces réalisés doivent être régularisés financièrement');const[handovers]=await c.execute<RowDataPacket[]>('SELECT id FROM repair_order_handovers WHERE repair_order_id=? FOR UPDATE',[id]);if(handovers[0])throw new HttpError(409,'Le véhicule a déjà été remis');await c.execute("UPDATE repair_orders SET status='abandoned',abandoned_at=NOW(),abandoned_by=? WHERE id=?",[r.user!.sub,id]);await c.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,'abandonment_pending','abandoned','Abandon client finalisé',?)",[id,r.user!.sub]);return ids});for(const scheduleId of scheduleIds)emitToAgency(String(ro.agency_id),'workshop:schedule-cancelled',{id:scheduleId});emitToAgency(String(ro.agency_id),'workshop:status',{id,repairOrderId:id,agencyId:String(ro.agency_id),status:'abandoned'});emitToAgency(String(ro.agency_id),'parts:stock-changed',{repairOrderId:id,agencyId:String(ro.agency_id)});await notify(String(ro.agency_id),'Abandon client finalisé',ro.order_number,id);res.json(await detail(id,r));}));
workshopRouter.post('/repair-orders/:id/abandonment/handover',serviceAccess('service.order.abandon'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),ro=await one(id,r);if(ro.status!=='abandoned')throw new HttpError(409,"L'OR doit être abandonné avant restitution");const customer=txt(r.body.customerName,'Client',200,true)!,signature=txt(r.body.signatureData,'Signature',200000,true)!,mileage=r.body.mileageOut==null?null:Number(r.body.mileageOut);if(mileage!=null&&(!Number.isInteger(mileage)||mileage<Number(ro.mileage_in??0)))throw new HttpError(409,"Le kilométrage de sortie doit être supérieur ou égal au kilométrage d’entrée");await transaction(async c=>{const[orders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(orders[0]?.status!=='abandoned')throw new HttpError(409,'Statut incompatible avec la restitution');const[existing]=await c.execute<RowDataPacket[]>('SELECT id FROM repair_order_handovers WHERE repair_order_id=? FOR UPDATE',[id]);if(existing[0])return;await c.execute("INSERT INTO repair_order_handovers(repair_order_id,customer_name,mileage_out,observations,signature_data,handed_over_by,handover_type)VALUES(?,?,?,?,?,?,'abandonment')",[id,customer,mileage,txt(r.body.observations,'Observations',5000),signature,r.user!.sub]);await c.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,'abandoned','abandoned','Restitution après abandon',?)",[id,r.user!.sub]);});emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'abandonment-handover'});await notify(String(ro.agency_id),'Véhicule restitué après abandon',ro.order_number,id);res.status(201).json(await detail(id,r));}));
workshopRouter.post(
  "/repair-orders",
  serviceAccess('service.order.create'),
  asyncHandler(async (r, res) => {
    const customer = idOf(r.body.customerId),
      vehicle = idOf(r.body.vehicleId);
    const agency=await serviceCustomerAgency(r,customer);
    const mileage=Number(r.body.mileage??0);if(!Number.isInteger(mileage)||mileage<0)throw new HttpError(400,"Kilométrage invalide");
    if(Boolean(r.body.warrantyCovered)&&!txt(r.body.warrantyReference,"Référence garantie",100))throw new HttpError(400,"Référence garantie requise");
    const promised=r.body.promisedCompletionAt?dateTime(r.body.promisedCompletionAt,"Fin promise"):null;
    const [valid] = await query<RowDataPacket[]>(
      "SELECT c.id FROM customers c JOIN vehicles v ON v.agency_id=c.agency_id WHERE c.id=? AND v.id=? AND c.agency_id=? AND (EXISTS(SELECT 1 FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.vehicle_id=v.id AND s.customer_id=c.id) OR EXISTS(SELECT 1 FROM repair_orders ro WHERE ro.vehicle_id=v.id AND ro.customer_id=c.id))",
      [customer, vehicle, agency],
    );
    if (!valid)
      throw new HttpError(
        400,
        "Ce véhicule n’est pas lié au client dans cette agence",
      );
    const appointment=r.body.appointmentId?idOf(r.body.appointmentId):null;
    const advisor=idOf(r.body.advisorId??r.user!.sub);
    if(advisor!==r.user!.sub){const assignmentScope=await assertPermission(r,'service.order.assign_advisor');if(assignmentScope==='OWN'||!await permissionCoversAgency(r,'service.order.assign_advisor',String(agency)))throw new HttpError(403,'Périmètre d’affectation du conseiller SAV insuffisant');}
    const no = `OR-${Date.now()}`;
    const repairOrderId=await transaction(async c=>{
      await assertAdvisorCandidate(c,advisor,agency);
      if(appointment){const [appointments]=await c.execute<RowDataPacket[]>("SELECT id FROM service_appointments WHERE id=? AND customer_id=? AND vehicle_id=? AND agency_id=? FOR UPDATE",[appointment,customer,vehicle,agency]);if(!appointments[0])throw new HttpError(400,"Rendez-vous SAV incompatible");}
      const [x] = await c.execute<ResultSetHeader>(
        `INSERT INTO repair_orders(order_number,appointment_id,customer_id,vehicle_id,agency_id,advisor_id,mileage_in,complaint,diagnosis_summary,status,warranty_covered,warranty_reference,promised_completion_at,created_by)VALUES(?,?,?,?,?,?,?,?,?,'planned',?,?,?,?)`,
        [
          no,
          appointment,
          customer,
          vehicle,
          agency,
          advisor,
          mileage,
          txt(r.body.complaint, "Motif", 5000, true),
          txt(r.body.diagnosisSummary, "Diagnostic", 5000),
          Boolean(r.body.warrantyCovered),
          txt(r.body.warrantyReference, "Garantie", 100),
          promised,
          r.user!.sub,
        ],
      );
      await c.execute(
      `INSERT INTO repair_order_status_history(repair_order_id,new_status,reason,changed_by)VALUES(?,'planned','Ouverture OR',?)`,
      [x.insertId, r.user!.sub],
      );if(appointment)await c.execute("UPDATE service_appointments SET status='completed' WHERE id=?",[appointment]);return String(x.insertId);
    });
    emitToAgency(agency, "workshop:repair-order-created", {
      id: repairOrderId,
      orderNumber: no,
    });
    await notify(agency, "Nouvel ordre de réparation", no, repairOrderId);
    res.status(201).json(await detail(repairOrderId, r));
  }),
);
workshopRouter.patch(
  "/repair-orders/:id/status",
  requireTransitionPermission,
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),
      ro = await one(id, r),
      next = txt(r.body.status, "Statut", 40, true)!;
    const reason=txt(r.body.reason,"Motif",500,next==='cancelled');
    if(['invoiced','delivered'].includes(next))throw new HttpError(409,next==='invoiced'?"Utilisez la génération de facture":"Utilisez la remise du véhicule");
    const valid=(next==='cancelled'&&!['ready','invoiced','delivered','closed','cancelled'].includes(ro.status))||(normalTransitions[ro.status]??[]).includes(next);
    if (!valid)
      throw new HttpError(409, `Transition ${ro.status} → ${next} interdite`);
    if (next === "in_progress") {
      if(ro.status==='quality_control'){
        const [qc]=await query<RowDataPacket[]>("SELECT result FROM repair_quality_controls WHERE repair_order_id=? ORDER BY controlled_at DESC LIMIT 1",[id]);
        if(qc?.result!=='failed')throw new HttpError(409,"Un retour en travaux exige un contrôle qualité refusé");
      } else {
      const [a] = await query<RowDataPacket[]>(
        "SELECT approved FROM repair_approvals WHERE repair_order_id=? ORDER BY recorded_at DESC LIMIT 1",
        [id],
      );
      if (!a?.approved)
        throw new HttpError(409, "Validation client obligatoire");
      }
    }
    if(next==='received'){const [inspection]=await query<RowDataPacket[]>("SELECT id FROM vehicle_reception_inspections WHERE repair_order_id=?",[id]);if(!inspection)throw new HttpError(409,"Inspection de réception obligatoire");}
    if(next==='waiting_approval'){const [[diagnostic],[estimate]]=await Promise.all([query<RowDataPacket[]>("SELECT id FROM diagnostics WHERE repair_order_id=?",[id]),query<RowDataPacket[]>("SELECT id FROM repair_order_estimate_items WHERE repair_order_id=? LIMIT 1",[id])]);if(!diagnostic)throw new HttpError(409,"Diagnostic obligatoire");if(!estimate)throw new HttpError(409,"Chiffrage obligatoire avant validation client");}
    if(next==='quality_control'){const [openIntervention]=await query<RowDataPacket[]>("SELECT id FROM interventions WHERE repair_order_id=? AND status NOT IN('completed','cancelled') LIMIT 1",[id]);if(openIntervention)throw new HttpError(409,"Toutes les interventions doivent être terminées");const [running]=await query<RowDataPacket[]>("SELECT id FROM work_sessions WHERE repair_order_id=? AND status='running' LIMIT 1",[id]);if(running)throw new HttpError(409,"Une session de travail est encore active");}
    if(next==='ready'){const [qc]=await query<RowDataPacket[]>("SELECT result,planned_work_completed,defect_corrected,no_leaks,levels_checked,cleanliness_checked FROM repair_quality_controls WHERE repair_order_id=? ORDER BY controlled_at DESC LIMIT 1",[id]);if(!qc||qc.result!=='passed'||![qc.planned_work_completed,qc.defect_corrected,qc.no_leaks,qc.levels_checked,qc.cleanliness_checked].every(Boolean))throw new HttpError(409,"Contrôle qualité validé obligatoire");}
    await transaction(async (c) => {
      const[lockedRows]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_orders WHERE id=? FOR UPDATE',[id]),locked=lockedRows[0];
      if(!locked||locked.status!==ro.status)throw new HttpError(409,'Le statut de l’OR a changé');
      if(next==='cancelled'){
        const impact=await abandonmentImpact(c,id);
        if(impact.activeSessions)throw new HttpError(409,'Arrêtez la session active avant l’annulation');
        if(impact.completedInterventions||impact.actualHours>0||impact.consumedParts>0||impact.actualItemsTotal>0)throw new HttpError(409,'Une activité réelle existe : utilisez le workflow d’abandon');
        await cleanupAbandonment(c,id,String(ro.agency_id),r.user!.sub);
      }
      await c.execute(
        `UPDATE repair_orders SET status=?,received_at=IF(?='received',NOW(),received_at),closed_at=IF(?='closed',NOW(),closed_at),cancellation_reason=IF(?='cancelled',?,cancellation_reason) WHERE id=?`,
        [next, next, next, next, reason, id],
      );
      await c.execute(
        "INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,?,?,?,?)",
        [id, ro.status, next, reason, r.user!.sub],
      );
    });
    emitToAgency(String(ro.agency_id), "workshop:status", { id,repairOrderId:id,agencyId:String(ro.agency_id), status: next });
    await notify(
      String(ro.agency_id),
      "Statut atelier mis à jour",
      `${ro.order_number}: ${next}`,
      id,
    );
    res.json(await detail(id, r));
  }),
);
workshopRouter.post(
  "/repair-orders/:id/inspection",
  serviceAccess('service.order.receive'),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),ro=await one(id, r);ensureWritable(ro,['planned']);
    const hasMileage=Object.prototype.hasOwnProperty.call(r.body,'mileage'),rawMileage=r.body.mileage;
    const submittedMileage=!hasMileage||rawMileage==null||rawMileage===''?null:Number(rawMileage);
    if(hasMileage&&rawMileage!=null&&rawMileage!==''&&(!Number.isInteger(submittedMileage)||Number(submittedMileage)<0))throw new HttpError(400,'Kilométrage invalide');
    await transaction(async c=>{
      await c.execute<RowDataPacket[]>('SELECT id FROM repair_orders WHERE id=? FOR UPDATE',[id]);
      const[rows]=await c.execute<RowDataPacket[]>('SELECT * FROM vehicle_reception_inspections WHERE repair_order_id=? FOR UPDATE',[id]),existing=rows[0];
      if(existing)throw new HttpError(409,'La réception a déjà été enregistrée');
      const value=(key:string,column:string,label:string,max:number,required=false)=>{
        if(!Object.prototype.hasOwnProperty.call(r.body,key)){if(required)throw new HttpError(400,`${label} est requis`);return null;}
        const raw=r.body[key];if(raw!=null&&typeof raw!=='string')throw new HttpError(400,`${label} invalide`);
        return txt(raw,label,max,required);
      };
      const mileage:unknown=submittedMileage;
      await c.execute(
      `INSERT INTO vehicle_reception_inspections(repair_order_id,fuel_level,cleanliness,bodywork_damage,items_in_vehicle,mileage,observations,customer_signature,inspected_by)VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE fuel_level=VALUES(fuel_level),cleanliness=VALUES(cleanliness),bodywork_damage=VALUES(bodywork_damage),items_in_vehicle=VALUES(items_in_vehicle),mileage=VALUES(mileage),observations=VALUES(observations),customer_signature=VALUES(customer_signature),inspected_by=VALUES(inspected_by),inspected_at=NOW()`,
      [
        id,
        value('fuelLevel','fuel_level','Niveau de carburant',100,true),
        value('cleanliness','cleanliness','Propreté',100,true),
        value('bodyworkDamage','bodywork_damage','Dommages carrosserie',5000),
        value('itemsInVehicle','items_in_vehicle','Objets dans le véhicule',5000),
        mileage,
        value('observations','observations','Observations',5000),
        value('customerSignature','customer_signature','Signature client',200000),
        r.user!.sub,
      ],
      );
    });
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'inspection'});res.json(await detail(id, r));
  }),
);
workshopRouter.post(
  "/repair-orders/:id/diagnostics",
  serviceAccess('service.order.diagnose'),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),ro=await one(id, r);ensureWritable(ro,['received','diagnosis']);
    const hours=Number(r.body.estimatedHours??0);if(hours<0||!Number.isFinite(hours))throw new HttpError(400,"Temps estimé invalide");
    await transaction(async c=>{await c.execute<RowDataPacket[]>('SELECT id FROM repair_orders WHERE id=? FOR UPDATE',[id]);const[existing]=await c.execute<RowDataPacket[]>('SELECT id FROM diagnostics WHERE repair_order_id=? LIMIT 1 FOR UPDATE',[id]);if(existing[0])throw new HttpError(409,'Le diagnostic a déjà été enregistré');const technician=r.body.technicianId?await resolveRepairTechnician(c,r.body.technicianId,String(ro.agency_id)):null;await c.execute(
      "INSERT INTO diagnostics(repair_order_id,technician_id,diagnosis,recommendations,estimated_hours)VALUES(?,?,?,?,?)",
      [
        id,
        technician,
        txt(r.body.diagnosis, "Diagnostic", 10000, true),
        txt(r.body.recommendations, "Recommandations", 10000),
        hours,
      ],
    );});
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'diagnostic'});res.status(201).json(await detail(id, r));
  }),
);
workshopRouter.post(
  "/repair-orders/:id/estimate-items",
  serviceAccess('service.order.update'),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),ro=await one(id,r);ensureWritable(ro,['diagnosis','waiting_approval']);
    const type=txt(r.body.itemType,'Type',20,true)!,quantity=Number(r.body.quantity),discount=Number(r.body.discount??0),key=requestKey(r.body.requestKey);
    if(!['labor','part'].includes(type)||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(discount)||discount<0)throw new HttpError(400,'Ligne de chiffrage invalide');
    if(type==='part'){await assertAnyPermission(r,['parts.reservation.view','parts.reservation.create']);const partPermission=r.rbac?.permissions.has('parts.reservation.view')?'parts.reservation.view':'parts.reservation.create';if(!await permissionCoversAgency(r,partPermission,String(ro.agency_id)))throw new HttpError(403,'Périmètre Pièces insuffisant pour ce chiffrage');}
    const config=await getEffectiveBusinessSettings(String(ro.agency_id));
    await transaction(async c=>{
      const[lockedOrders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]),locked=lockedOrders[0];
      if(!locked||!['diagnosis','waiting_approval'].includes(locked.status))throw new HttpError(409,'Le chiffrage est verrouillé à ce statut');
      const[decisions]=await c.execute<RowDataPacket[]>('SELECT id FROM repair_approvals WHERE repair_order_id=? LIMIT 1 FOR UPDATE',[id]);
      if(decisions[0])throw new HttpError(409,'Le chiffrage soumis au client est verrouillé');
      if(key){const[existing]=await c.execute<RowDataPacket[]>('SELECT id,item_type,part_id,labor_rate_id,quantity FROM repair_order_estimate_items WHERE repair_order_id=? AND request_key=? FOR UPDATE',[id,key]);if(existing[0]){if(existing[0].item_type!==type||String(existing[0].part_id??'')!==String(r.body.partId??'')||r.body.laborRateId!=null&&String(existing[0].labor_rate_id??'')!==String(r.body.laborRateId)||Number(existing[0].quantity)!==quantity)throw new HttpError(409,'Clé de chiffrage déjà utilisée avec un contenu différent');return}}
      let partId:null|string=null,laborRateId:null|string=null,rateCodeSnapshot:null|string=null,rateLabelSnapshot:null|string=null,description:string,unitPrice:number;
      if(type==='part'){
        partId=idOf(r.body.partId);
        const[parts]=await c.execute<RowDataPacket[]>('SELECT p.name,p.sale_price FROM parts p WHERE p.id=? AND p.is_active=TRUE AND EXISTS(SELECT 1 FROM part_stocks ps WHERE ps.part_id=p.id AND ps.agency_id=?)',[partId,ro.agency_id]);
        if(!parts[0])throw new HttpError(400,'Pièce indisponible dans le périmètre de cet OR');
        description=String(parts[0].name);unitPrice=Number(parts[0].sale_price);
      }else{
        const rate=await resolveEffectiveLaborRateSelection(String(ro.agency_id),r.body,c);laborRateId=rate.id;rateCodeSnapshot=rate.code;rateLabelSnapshot=rate.label;
        description=txt(r.body.description,'Description',255,true)!;unitPrice=rate.hourlyRate;
      }
      const gross=quantity*unitPrice;if(discount>gross)throw new HttpError(400,'La remise dépasse le montant brut');const lineTotal=gross-discount;
      await c.execute("INSERT INTO repair_order_estimate_items(repair_order_id,part_id,labor_rate_id,rate_code_snapshot,rate_label_snapshot,item_type,description,quantity,unit_price,discount,tax_rate,line_total,request_key,created_by)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",[id,partId,laborRateId,rateCodeSnapshot,rateLabelSnapshot,type,description,quantity,unitPrice,discount,config.vatRate,lineTotal,key,r.user!.sub]);
      await c.execute("UPDATE repair_orders SET estimated_total=(SELECT COALESCE(SUM(line_total*(1+tax_rate/100)),0) FROM repair_order_estimate_items WHERE repair_order_id=?) WHERE id=?",[id,id]);
    });
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'estimate'});res.status(201).json(await detail(id,r));
  }),
);
workshopRouter.delete('/repair-orders/:id/estimate-items/:itemId',serviceAccess('service.order.update'),asyncHandler(async(r,res)=>{
  const id=idOf(r.params.id),itemId=idOf(r.params.itemId),ro=await one(id,r);ensureWritable(ro,['diagnosis','waiting_approval']);
  await transaction(async c=>{const[lockedOrders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(!lockedOrders[0]||!['diagnosis','waiting_approval'].includes(lockedOrders[0].status))throw new HttpError(409,'Le chiffrage est verrouillé à ce statut');const[decisions]=await c.execute<RowDataPacket[]>('SELECT id FROM repair_approvals WHERE repair_order_id=? LIMIT 1 FOR UPDATE',[id]);if(decisions[0])throw new HttpError(409,'Le chiffrage soumis au client est verrouillé');const[result]=await c.execute<ResultSetHeader>('DELETE FROM repair_order_estimate_items WHERE id=? AND repair_order_id=?',[itemId,id]);if(!result.affectedRows)throw new HttpError(404,'Ligne de chiffrage introuvable');await c.execute("UPDATE repair_orders SET estimated_total=(SELECT COALESCE(SUM(line_total*(1+tax_rate/100)),0) FROM repair_order_estimate_items WHERE repair_order_id=?) WHERE id=?",[id,id]);});
  emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'estimate'});res.json(await detail(id,r));
}));
workshopRouter.post(
  "/repair-orders/:id/approval",
  serviceAccess('service.order.approve'),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),ro=await one(id, r);ensureWritable(ro,['waiting_approval']);
    await transaction(async c=>{const[orders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(orders[0]?.status!=='waiting_approval')throw new HttpError(409,'La décision client n’est plus disponible');const[existing]=await c.execute<RowDataPacket[]>('SELECT id FROM repair_approvals WHERE repair_order_id=? LIMIT 1 FOR UPDATE',[id]);if(existing[0])throw new HttpError(409,'La décision client a déjà été enregistrée');const[estimate]=await c.execute<RowDataPacket[]>('SELECT line_total,tax_rate FROM repair_order_estimate_items WHERE repair_order_id=? FOR UPDATE',[id]);const approvedAmount=estimate.reduce((total,item)=>total+Number(item.line_total)*(1+Number(item.tax_rate)/100),0);if(approvedAmount<=0)throw new HttpError(409,'Un chiffrage positif est obligatoire avant la décision client');await c.execute(
      "INSERT INTO repair_approvals(repair_order_id,approved,approved_amount,customer_name,signature_data,notes,recorded_by)VALUES(?,?,?,?,?,?,?)",
      [
        id,
        Boolean(r.body.approved),
        approvedAmount,
        txt(r.body.customerName, "Client", 200, true),
        r.body.signatureData ?? null,
        r.body.notes ?? null,
        r.user!.sub,
      ],
    );});
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'approval'});res.status(201).json(await detail(id, r));
  }),
);
workshopRouter.get(
  "/service-appointments",
  serviceAccess('service.order.view'),
  asyncHandler(async (r, res) => {
    const s = unrestricted(r) ? { sql: "1=1", p: [] } : { sql: "sa.agency_id=?", p: [r.user!.agencyId] };
    res.json(await query<RowDataPacket[]>(`SELECT sa.*,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,v.vin,v.registration_number FROM service_appointments sa JOIN customers c ON c.id=sa.customer_id JOIN vehicles v ON v.id=sa.vehicle_id WHERE ${s.sql} ORDER BY sa.scheduled_at`, s.p));
  }),
);
workshopRouter.post(
  "/service-appointments",
  serviceAccess('service.order.create'),
  asyncHandler(async (r, res) => {
    const customer=idOf(r.body.customerId), vehicle=idOf(r.body.vehicleId);
    const agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;
    const [valid]=await query<RowDataPacket[]>("SELECT c.id FROM customers c JOIN vehicles v ON v.agency_id=c.agency_id WHERE c.id=? AND v.id=? AND c.agency_id=? AND (EXISTS(SELECT 1 FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.vehicle_id=v.id AND s.customer_id=c.id) OR EXISTS(SELECT 1 FROM repair_orders ro WHERE ro.vehicle_id=v.id AND ro.customer_id=c.id))",[customer,vehicle,agency]);
    if(!valid) throw new HttpError(400,"Client et véhicule doivent appartenir à la même agence");
    const no=`RDV-SAV-${Date.now()}`;
    const advisor=idOf(r.body.advisorId??r.user!.sub);
    if(advisor!==r.user!.sub){const assignmentScope=await assertPermission(r,'service.order.assign_advisor');if(assignmentScope==='OWN'||!await permissionCoversAgency(r,'service.order.assign_advisor',String(agency)))throw new HttpError(403,'Périmètre d’affectation du conseiller SAV insuffisant');}
    const x=await transaction(async c=>{await assertAdvisorCandidate(c,advisor,String(agency));const[result]=await c.execute<ResultSetHeader>(`INSERT INTO service_appointments(appointment_number,customer_id,vehicle_id,agency_id,advisor_id,scheduled_at,reason,symptoms,status)VALUES(?,?,?,?,?,?,?,?,'scheduled')`,[no,customer,vehicle,agency,advisor,r.body.scheduledAt,txt(r.body.reason,"Motif",255,true),txt(r.body.symptoms,"Symptômes",5000)]);return result});
    emitToAgency(String(agency),"workshop:appointment-created",{id:String(x.insertId),appointmentNumber:no});
    res.status(201).json({id:String(x.insertId),appointmentNumber:no});
  }),
);
workshopRouter.patch(
  "/service-appointments/:id/status",
  serviceAccess('service.order.create'),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),status=txt(r.body.status,"Statut",20,true)!;
    if(!["scheduled","confirmed","received","cancelled","completed"].includes(status)) throw new HttpError(400,"Statut de rendez-vous invalide");
    const agency=unrestricted(r)?idOf(r.body.agencyId):r.user!.agencyId!;
    const x=await execute("UPDATE service_appointments SET status=? WHERE id=? AND agency_id=?",[status,id,agency]);
    if(!x.affectedRows) throw new HttpError(404,"Rendez-vous introuvable");
    emitToAgency(String(agency),"workshop:appointment-status",{id,status}); res.json({id,status});
  }),
);
workshopRouter.post(
  "/repair-orders/:id/items",
  serviceAccess('service.order.update'),requirePartsStockAccess,
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),
      ro = await one(id, r),
      type = txt(r.body.itemType, "Type", 20, true)!,
      qty = Number(r.body.quantity),key=requestKey(r.body.requestKey),estimateItemId=r.body.estimateItemId?idOf(r.body.estimateItemId):null;
    ensureWritable(ro,['in_progress']);
    const businessConfig=await getEffectiveBusinessSettings(String(ro.agency_id));
    let price=type==='labor'||type==='part'?0:Number(r.body.unitPrice),description=txt(r.body.description,"Description",255,!estimateItemId),laborRateId:null|string=null,rateCodeSnapshot:null|string=null,rateLabelSnapshot:null|string=null;
    if (
      !["part", "labor", "accessory", "other"].includes(type) ||
      !Number.isFinite(qty) || qty <= 0 ||
      !Number.isFinite(price) || price < 0
    )
      throw new HttpError(400, "Ligne OR invalide");
    let changedStock:any=null;
    await transaction(async (c) => {
      const[lockedOrders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(lockedOrders[0]?.status!=='in_progress')throw new HttpError(409,'Les consommations sont gelées pour cet OR');
      if(estimateItemId){if(type!=='labor')throw new HttpError(400,'Seule la main-d’œuvre estimée peut devenir facturable par ce flux');const[approved]=await c.execute<RowDataPacket[]>('SELECT approved FROM repair_approvals WHERE repair_order_id=? ORDER BY recorded_at DESC LIMIT 1 FOR UPDATE',[id]);if(!approved[0]?.approved)throw new HttpError(409,'Une acceptation client est obligatoire');const[estimates]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_order_estimate_items WHERE id=? AND repair_order_id=? AND item_type=\'labor\' FOR UPDATE',[estimateItemId,id]);const estimate=estimates[0];if(!estimate)throw new HttpError(404,'Main-d’œuvre estimative introuvable');if(qty>Number(estimate.quantity))throw new HttpError(409,'Le temps facturable dépasse le temps autorisé; une autorisation complémentaire est nécessaire');price=Number(estimate.unit_price);description=String(estimate.description);laborRateId=estimate.labor_rate_id?String(estimate.labor_rate_id):null;rateCodeSnapshot=estimate.rate_code_snapshot;rateLabelSnapshot=estimate.rate_label_snapshot;const[existingEstimateItem]=await c.execute<RowDataPacket[]>('SELECT id FROM repair_order_items WHERE estimate_item_id=? FOR UPDATE',[estimateItemId]);if(existingEstimateItem[0])return;}
      else if(type==='labor'){const rate=await resolveEffectiveLaborRateSelection(String(ro.agency_id),r.body,c);laborRateId=rate.id;rateCodeSnapshot=rate.code;rateLabelSnapshot=rate.label;price=rate.hourlyRate;}
      if(key)await c.execute('SELECT id FROM repair_orders WHERE id=? FOR UPDATE',[id]);
      if(key){const[existing]=await c.execute<RowDataPacket[]>('SELECT id,item_type,part_id,description,quantity FROM repair_order_items WHERE repair_order_id=? AND request_key=? FOR UPDATE',[id,key]);if(existing[0]){if(existing[0].item_type!==type||String(existing[0].part_id??'')!==String(r.body.partId??'')||existing[0].description!==String(r.body.description??'').trim()||Number(existing[0].quantity)!==qty)throw new HttpError(409,'Clé de requête déjà utilisée avec un contenu différent');return}}
      if(r.body.interventionId){const [linked]=await c.execute<RowDataPacket[]>("SELECT id FROM interventions WHERE id=? AND repair_order_id=?",[idOf(r.body.interventionId),id]);if(!linked[0])throw new HttpError(400,"Intervention étrangère à cet OR");}
      let partStockId:any=null;
      if (type === "part") {
        const part = idOf(r.body.partId), location=r.body.locationId?idOf(r.body.locationId):null;
        const[parts]=await c.execute<RowDataPacket[]>('SELECT sale_price FROM parts WHERE id=? AND is_active=TRUE',[part]);if(!parts[0])throw new HttpError(400,'Pièce inactive ou introuvable');price=Number(parts[0].sale_price);
        const stock=r.body.partStockId?await lockPartStockById(c,idOf(r.body.partStockId),part,String(ro.agency_id)):await lockPartStock(c,part,String(ro.agency_id),location);
        await assertRepairWarehouse(c,stock,String(ro.agency_id));
        if(r.body.locationId&&String(stock.location_id)!==String(r.body.locationId))throw new HttpError(400,'Emplacement et stock incohérents');
        changedStock={partId:part,locationId:stock.location_id};
        partStockId=stock.id;
        if (Number(stock.current_stock) - Number(stock.reserved_stock) < qty)
          throw new HttpError(409, "Stock insuffisant");
        await c.execute(
          "UPDATE part_stocks SET current_stock=current_stock-? WHERE id=?",
          [qty, stock.id],
        );
        await c.execute(
          `INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'repair_order',?,'repair_order',?,'Consommation OR',?)`,
          [part, ro.agency_id, stock.location_id, -qty, id, r.user!.sub],
        );
      }
      const total = qty * price - Number(r.body.discount ?? 0);
      await c.execute(
        "INSERT INTO repair_order_items(repair_order_id,part_id,part_stock_id,labor_rate_id,rate_code_snapshot,rate_label_snapshot,intervention_id,estimate_item_id,item_type,description,quantity,unit_price,discount,tax_rate,line_total,request_key)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          id,
          r.body.partId ?? null,
          partStockId,
          laborRateId,
          rateCodeSnapshot,
          rateLabelSnapshot,
          r.body.interventionId??null,
          estimateItemId,
          type,
          description,
          qty,
          price,
          r.body.discount ?? 0,
          businessConfig.vatRate,
          total,
          key,
        ],
      );
    });
    emitToAgency(String(ro.agency_id), "parts:stock-changed", {repairOrderId:id,agencyId:String(ro.agency_id),partId:changedStock?.partId??null,locationId:changedStock?.locationId??null});
    res.status(201).json(await detail(id, r));
  }),
);
workshopRouter.patch('/repair-orders/:id/items/:itemId',serviceAccess('service.order.update'),requirePartsStockAccess,asyncHandler(async(r,res)=>{const id=idOf(r.params.id),itemId=idOf(r.params.itemId),ro=await one(id,r);ensureWritable(ro);const quantity=Number(r.body.quantity),price=r.body.unitPrice==null?null:Number(r.body.unitPrice);if(!Number.isFinite(quantity)||quantity<=0||price!=null&&(!Number.isFinite(price)||price<0))throw new HttpError(400,'Quantité ou tarif invalide');const changed=await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_order_items WHERE id=? AND repair_order_id=? AND status=\'active\' FOR UPDATE',[itemId,id]);const item=rows[0];if(!item)throw new HttpError(404,'Ligne OR active introuvable');if(item.item_type==='labor'&&price!=null&&price!==Number(item.unit_price))throw new HttpError(400,'Le tarif de main-d’œuvre snapshoté ne peut pas être remplacé par le client');const delta=quantity-Number(item.quantity);if(item.item_type==='part'&&delta!==0){if(!item.part_stock_id)throw new HttpError(409,'Ligne historique sans stock local; correction manuelle requise');const [stocks]=await c.execute<RowDataPacket[]>('SELECT * FROM part_stocks WHERE id=? AND part_id=? AND agency_id=? FOR UPDATE',[item.part_stock_id,item.part_id,ro.agency_id]);const stock=stocks[0];if(!stock)throw new HttpError(409,'Stock local introuvable');if(delta>0){await assertRepairWarehouse(c,stock,String(ro.agency_id));if(Number(stock.current_stock)-Number(stock.reserved_stock)<delta)throw new HttpError(409,'Stock disponible insuffisant')}await c.execute('UPDATE part_stocks SET current_stock=current_stock-? WHERE id=?',[delta,stock.id]);await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'adjustment',?,'repair_order',?,'Correction ligne OR',?)",[item.part_id,ro.agency_id,stock.location_id,-delta,id,r.user!.sub]);}const unitPrice=price??Number(item.unit_price),discount=Number(item.discount);await c.execute('UPDATE repair_order_items SET quantity=?,unit_price=?,line_total=? WHERE id=?',[quantity,unitPrice,quantity*unitPrice-discount,itemId]);return{partId:item.part_id?String(item.part_id):null,partStockId:item.part_stock_id?String(item.part_stock_id):null};});emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'items'});if(changed.partId)emitToAgency(String(ro.agency_id),'parts:stock-changed',{repairOrderId:id,agencyId:String(ro.agency_id),...changed});res.json(await detail(id,r));}));
workshopRouter.delete('/repair-orders/:id/items/:itemId',serviceAccess('service.order.update'),requirePartsStockAccess,asyncHandler(async(r,res)=>{const id=idOf(r.params.id),itemId=idOf(r.params.itemId),ro=await one(id,r);ensureWritable(ro);const changed=await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_order_items WHERE id=? AND repair_order_id=? AND status=\'active\' FOR UPDATE',[itemId,id]);const item=rows[0];if(!item)throw new HttpError(404,'Ligne OR active introuvable');if(item.item_type==='part'){if(!item.part_stock_id)throw new HttpError(409,'Ligne historique sans stock local; annulation manuelle requise');const [stocks]=await c.execute<RowDataPacket[]>('SELECT * FROM part_stocks WHERE id=? AND part_id=? AND agency_id=? FOR UPDATE',[item.part_stock_id,item.part_id,ro.agency_id]);const stock=stocks[0];if(!stock)throw new HttpError(409,'Stock local introuvable');await c.execute('UPDATE part_stocks SET current_stock=current_stock+? WHERE id=?',[item.quantity,stock.id]);await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'adjustment',?,'repair_order',?,'Annulation ligne OR',?)",[item.part_id,ro.agency_id,stock.location_id,item.quantity,id,r.user!.sub]);}await c.execute("UPDATE repair_order_items SET status='cancelled',cancelled_by=?,cancelled_at=NOW() WHERE id=?",[r.user!.sub,itemId]);return{partId:item.part_id?String(item.part_id):null,partStockId:item.part_stock_id?String(item.part_stock_id):null};});emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'items'});if(changed.partId)emitToAgency(String(ro.agency_id),'parts:stock-changed',{repairOrderId:id,agencyId:String(ro.agency_id),...changed});res.json(await detail(id,r));}));
workshopRouter.post(
  "/repair-orders/:id/estimate-items/:estimateItemId/intervention",
  serviceAccess('service.order.advance'),
  asyncHandler(async(r,res)=>{
    const id=idOf(r.params.id),estimateId=idOf(r.params.estimateItemId),ro=await one(id,r);ensureWritable(ro,['in_progress']);
    await transaction(async c=>{
      const[orders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(orders[0]?.status!=='in_progress')throw new HttpError(409,'Les travaux ne sont pas autorisés à ce statut');
      const[estimates]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_order_estimate_items WHERE id=? AND repair_order_id=? FOR UPDATE',[estimateId,id]);const estimate=estimates[0];if(!estimate||estimate.item_type!=='labor')throw new HttpError(404,'Ligne de main-d’œuvre estimative introuvable');
      const[approvals]=await c.execute<RowDataPacket[]>('SELECT approved FROM repair_approvals WHERE repair_order_id=? ORDER BY recorded_at DESC LIMIT 1 FOR UPDATE',[id]);if(!approvals[0]?.approved)throw new HttpError(409,'Une acceptation client est obligatoire');
      const[existing]=await c.execute<RowDataPacket[]>('SELECT id FROM interventions WHERE estimate_item_id=? FOR UPDATE',[estimateId]);if(existing[0])return;
      const technician=r.body.technicianId?await resolveRepairTechnician(c,r.body.technicianId,String(ro.agency_id)):null;
      await c.execute("INSERT INTO interventions(repair_order_id,technician_id,estimate_item_id,description,intervention_type,planned_hours,unit_price,line_total,status)VALUES(?,?,?,?,?,?,?,?,'planned')",[id,technician,estimateId,estimate.description,'Réparation',estimate.quantity,estimate.unit_price,estimate.line_total]);
    });
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'interventions'});res.status(201).json(await detail(id,r));
  }),
);
workshopRouter.post(
  "/repair-orders/:id/interventions",
  serviceAccess('service.order.advance'),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),ro=await one(id,r);ensureWritable(ro,['in_progress']);
    const[acceptedEstimate]=await query<RowDataPacket[]>("SELECT e.id FROM repair_order_estimate_items e JOIN repair_approvals a ON a.repair_order_id=e.repair_order_id AND a.approved=TRUE WHERE e.repair_order_id=? LIMIT 1",[id]);if(acceptedEstimate)throw new HttpError(409,'Créez les interventions depuis le chiffrage accepté');
    const hours=Number(r.body.plannedHours??0),key=requestKey(r.body.requestKey);
    if(!Number.isFinite(hours)||hours<=0) throw new HttpError(400,"Durée planifiée invalide");
    await transaction(async c=>{if(key){await c.execute('SELECT id FROM repair_orders WHERE id=? FOR UPDATE',[id]);const[existing]=await c.execute<RowDataPacket[]>('SELECT id,description,planned_hours FROM interventions WHERE repair_order_id=? AND request_key=? FOR UPDATE',[id,key]);if(existing[0]){if(existing[0].description!==String(r.body.description??'').trim()||Number(existing[0].planned_hours)!==hours)throw new HttpError(409,'Clé d’intervention déjà utilisée avec un contenu différent');return}}const technician=r.body.technicianId?await resolveRepairTechnician(c,r.body.technicianId,String(ro.agency_id)):null;await c.execute("INSERT INTO interventions(repair_order_id,technician_id,description,intervention_type,planned_hours,unit_price,line_total,status,request_key)VALUES(?,?,?,?,?,0,0,'planned',?)",[id,technician,txt(r.body.description,"Intervention",5000,true),txt(r.body.interventionType,"Type",100),hours,key])});
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'interventions'});
    res.status(201).json(await detail(id,r));
  }),
);
workshopRouter.patch(
  "/repair-orders/:id/interventions/:interventionId/status",
  serviceAccess('service.order.advance'),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),intervention=idOf(r.params.interventionId),status=txt(r.body.status,"Statut",30,true)!;
    if(!["planned","assigned","in_progress","completed","cancelled"].includes(status)) throw new HttpError(400,"Statut d'intervention invalide");
    const ro=await one(id,r);ensureWritable(ro);const completedSchedules=await transaction(async c=>{const[works]=await c.execute<RowDataPacket[]>("SELECT status FROM interventions WHERE id=? AND repair_order_id=? FOR UPDATE",[intervention,id]),work=works[0];if(!work)throw new HttpError(404,"Intervention introuvable");if(work.status===status&&status==='completed')return[];const allowed:Record<string,string[]>={planned:['assigned','cancelled'],assigned:['in_progress','cancelled'],in_progress:['completed','cancelled']};if(!(allowed[work.status]??[]).includes(status))throw new HttpError(409,`Transition intervention ${work.status} → ${status} interdite`);const schedules=status==='completed'?await completeInterventionSchedules(c,intervention,r.user!.sub):[];await c.execute("UPDATE interventions SET status=? WHERE id=? AND repair_order_id=?",[status,intervention,id]);return schedules;});
    for(const scheduleId of completedSchedules)emitToAgency(String(ro.agency_id),'workshop:schedule-updated',{id:scheduleId,status:'completed'});
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'interventions'});res.json(await detail(id,r));
  }),
);
workshopRouter.post(
  "/repair-orders/:id/estimate-items/:estimateItemId/reserve",
  serviceAccess('service.order.update'),requirePermission('parts.reservation.create'),
  asyncHandler(async(r,res)=>{
    const id=idOf(r.params.id),estimateId=idOf(r.params.estimateItemId),stockId=idOf(r.body.partStockId),ro=await one(id,r);ensureWritable(ro,['in_progress']);
    if(!await permissionCoversAgency(r,'parts.reservation.create',String(ro.agency_id)))throw new HttpError(403,'Périmètre de réservation Pièces insuffisant');
    const reserved=await transaction(async c=>{
      const[lockedOrders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(!['diagnosis','waiting_approval','in_progress'].includes(String(lockedOrders[0]?.status)))throw new HttpError(409,'Les réservations sont gelées pour cet OR');
      const[orders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(orders[0]?.status!=='in_progress')throw new HttpError(409,'La réservation réelle exige un OR en cours');
      const[estimates]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_order_estimate_items WHERE id=? AND repair_order_id=? FOR UPDATE',[estimateId,id]);const estimate=estimates[0];if(!estimate||estimate.item_type!=='part'||!estimate.part_id)throw new HttpError(404,'Pièce estimative introuvable');
      const[approvals]=await c.execute<RowDataPacket[]>('SELECT approved FROM repair_approvals WHERE repair_order_id=? ORDER BY recorded_at DESC LIMIT 1 FOR UPDATE',[id]);if(!approvals[0]?.approved)throw new HttpError(409,'Une acceptation client est obligatoire');
      const[existing]=await c.execute<RowDataPacket[]>('SELECT id,location_id,status FROM part_reservations WHERE estimate_item_id=? FOR UPDATE',[estimateId]);if(existing[0])return{id:existing[0].id,locationId:existing[0].location_id,status:existing[0].status};
      const stock=await lockPartStockById(c,stockId,String(estimate.part_id),String(ro.agency_id));await assertRepairWarehouse(c,stock,String(ro.agency_id));const quantity=Number(estimate.quantity);
      if(Number(stock.current_stock)-Number(stock.reserved_stock)<quantity)throw new HttpError(409,'Stock disponible insuffisant pour la quantité autorisée');
      await c.execute('UPDATE part_stocks SET reserved_stock=reserved_stock+? WHERE id=?',[quantity,stock.id]);
      const[x]=await c.execute<ResultSetHeader>("INSERT INTO part_reservations(repair_order_id,part_id,agency_id,location_id,part_stock_id,quantity,estimate_item_id,created_by)VALUES(?,?,?,?,?,?,?,?)",[id,estimate.part_id,ro.agency_id,stock.location_id,stock.id,quantity,estimateId,r.user!.sub]);
      await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'reservation',?,'repair_order',?,'Réservation chiffrage accepté',?)",[estimate.part_id,ro.agency_id,stock.location_id,quantity,id,r.user!.sub]);return{id:x.insertId,locationId:stock.location_id,status:'reserved'};
    });
    emitToAgency(String(ro.agency_id),'parts:stock-changed',{repairOrderId:id,agencyId:String(ro.agency_id),locationId:reserved.locationId});res.status(201).json({id:String(reserved.id),status:reserved.status});
  }),
);
workshopRouter.post(
  "/repair-orders/:id/parts/reserve",
  serviceAccess('service.order.update'),requirePermission('parts.reservation.create'),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),part=idOf(r.body.partId),qty=Number(r.body.quantity),ro=await one(id,r),location=r.body.locationId?idOf(r.body.locationId):null,key=requestKey(r.body.requestKey);ensureWritable(ro,['diagnosis','waiting_approval','in_progress']);
    const[acceptedPart]=await query<RowDataPacket[]>("SELECT e.id FROM repair_order_estimate_items e JOIN repair_approvals a ON a.repair_order_id=e.repair_order_id AND a.approved=TRUE WHERE e.repair_order_id=? AND e.item_type='part' LIMIT 1",[id]);if(acceptedPart)throw new HttpError(409,'Réservez les pièces depuis le chiffrage accepté');
    if(!Number.isFinite(qty)||qty<=0) throw new HttpError(400,"Quantité invalide");
    if(!await permissionCoversAgency(r,'parts.reservation.create',String(ro.agency_id)))throw new HttpError(403,'Périmètre de réservation Pièces insuffisant');
    const reserved=await transaction(async c=>{
      const[orderLock]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(!['diagnosis','waiting_approval','in_progress'].includes(String(orderLock[0]?.status)))throw new HttpError(409,'Les réservations sont gelées pour cet OR');
      if(key){await c.execute('SELECT id FROM repair_orders WHERE id=? FOR UPDATE',[id]);const[existing]=await c.execute<RowDataPacket[]>('SELECT id,part_id,part_stock_id,quantity,location_id,status FROM part_reservations WHERE repair_order_id=? AND request_key=? FOR UPDATE',[id,key]);if(existing[0]){if(String(existing[0].part_id)!==part||Number(existing[0].quantity)!==qty||r.body.partStockId&&String(existing[0].part_stock_id)!==String(r.body.partStockId))throw new HttpError(409,'Clé de réservation déjà utilisée avec un contenu différent');return{id:existing[0].id,locationId:existing[0].location_id,status:existing[0].status}}}
      const stock=r.body.partStockId?await lockPartStockById(c,idOf(r.body.partStockId),part,String(ro.agency_id)):await lockPartStock(c,part,String(ro.agency_id),location);
      await assertRepairWarehouse(c,stock,String(ro.agency_id));
      if(r.body.locationId&&String(stock.location_id)!==String(r.body.locationId))throw new HttpError(400,'Emplacement et stock incohérents');
      if(Number(stock.current_stock)-Number(stock.reserved_stock)<qty) throw new HttpError(409,"Stock disponible insuffisant");
      await c.execute("UPDATE part_stocks SET reserved_stock=reserved_stock+? WHERE id=?",[qty,stock.id]);
      const [x]=await c.execute<ResultSetHeader>("INSERT INTO part_reservations(repair_order_id,part_id,agency_id,location_id,part_stock_id,quantity,created_by,request_key)VALUES(?,?,?,?,?,?,?,?)",[id,part,ro.agency_id,stock.location_id,stock.id,qty,r.user!.sub,key]);
      await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'reservation',?,'repair_order',?,'Réservation OR',?)",[part,ro.agency_id,stock.location_id,qty,id,r.user!.sub]);
      return {id:x.insertId,locationId:stock.location_id,status:'reserved'};
    });
    emitToAgency(String(ro.agency_id),"parts:stock-changed",{repairOrderId:id,partId:part,agencyId:String(ro.agency_id),locationId:reserved.locationId}); res.status(201).json({id:String(reserved.id),status:reserved.status});
  }),
);
workshopRouter.patch(
  "/repair-orders/:id/parts/reservations/:reservationId",
  serviceAccess('service.order.update'),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),reservation=idOf(r.params.reservationId),status=txt(r.body.status,"Statut",20,true)!;
    if(!["consumed","released"].includes(status)) throw new HttpError(400,"Action de réservation invalide");
    const reservationPermission=status==='consumed'?'parts.reservation.consume':'parts.reservation.release';await assertPermission(r,reservationPermission);
    const ro=await one(id,r);ensureWritable(ro,['diagnosis','waiting_approval','in_progress']);
    if(!await permissionCoversAgency(r,reservationPermission,String(ro.agency_id)))throw new HttpError(403,'Périmètre de réservation Pièces insuffisant');
    const businessConfig=await getEffectiveBusinessSettings(String(ro.agency_id));
    const changed=await transaction(async c=>{
      const[lockedOrders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(!['diagnosis','waiting_approval','in_progress'].includes(String(lockedOrders[0]?.status)))throw new HttpError(409,'Les mouvements de réservation sont gelés pour cet OR');
      const [rows]=await c.execute<RowDataPacket[]>("SELECT * FROM part_reservations WHERE id=? AND repair_order_id=? AND status='reserved' FOR UPDATE",[reservation,id]);
      const x=rows[0]; if(!x) throw new HttpError(404,"Réservation active introuvable");
      if(!x.part_stock_id)throw new HttpError(409,"Réservation historique non affectée à un emplacement; affectez-la avant traitement");
      const [stocks]=await c.execute<RowDataPacket[]>("SELECT * FROM part_stocks WHERE id=? AND part_id=? AND agency_id=? FOR UPDATE",[x.part_stock_id,x.part_id,ro.agency_id]);
      const stock=stocks[0];if(!stock)throw new HttpError(409,"Stock réservé introuvable");if(status==='consumed')await assertRepairWarehouse(c,stock,String(ro.agency_id));
      const remaining=Number(x.quantity)-Number(x.consumed_quantity??0),processed=status==='consumed'&&x.estimate_item_id?Number(r.body.quantity??remaining):remaining;if(!Number.isFinite(processed)||processed<=0||processed>remaining)throw new HttpError(409,'La quantité consommée dépasse la quantité autorisée restante');
      if(Number(stock.reserved_stock)<remaining||(status==='consumed'&&Number(stock.current_stock)<processed))throw new HttpError(409,"Cohérence du stock réservé invalide");
      const released=status==='released'?remaining:processed,nextConsumed=Number(x.consumed_quantity??0)+(status==='consumed'?processed:0),nextStatus=status==='released'?'released':nextConsumed>=Number(x.quantity)?'consumed':'reserved';
      await c.execute("UPDATE part_stocks SET reserved_stock=reserved_stock-?,current_stock=current_stock-? WHERE id=?",[released,status==='consumed'?processed:0,x.part_stock_id]);
      await c.execute("UPDATE part_reservations SET status=?,consumed_quantity=? WHERE id=?",[nextStatus,nextConsumed,reservation]);
      if(status==='consumed'){const [parts]=x.estimate_item_id?await c.execute<RowDataPacket[]>('SELECT description name,unit_price sale_price,tax_rate FROM repair_order_estimate_items WHERE id=? AND repair_order_id=? FOR UPDATE',[x.estimate_item_id,id]):await c.execute<RowDataPacket[]>("SELECT name,sale_price FROM parts WHERE id=?",[x.part_id]);const price=Number(parts[0]?.sale_price??0),tax=Number(parts[0]?.tax_rate??businessConfig.vatRate);await c.execute("INSERT INTO repair_order_items(repair_order_id,part_id,part_stock_id,estimate_item_id,item_type,description,quantity,unit_price,discount,tax_rate,line_total)VALUES(?,?,?,?,'part',?,?,?,0,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity),line_total=line_total+VALUES(line_total)",[id,x.part_id,x.part_stock_id,x.estimate_item_id??null,parts[0]?.name??`Pièce ${x.part_id}`,processed,price,tax,processed*price]);}
      await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,?,?,'repair_order',?,?,?)",[x.part_id,ro.agency_id,x.location_id,status==='consumed'?'repair_order':'release',status==='consumed'?-processed:remaining,id,status==='consumed'?'Consommation OR':'Libération OR',r.user!.sub]);
      return {partId:String(x.part_id),locationId:x.location_id??null,status:nextStatus};
    });
    emitToAgency(String(ro.agency_id),"parts:stock-changed",{repairOrderId:id,agencyId:String(ro.agency_id),...changed}); res.json({id:reservation,status:changed.status});
  }),
);
workshopRouter.post(
  "/repair-orders/:id/invoice",
  serviceAccess('service.order.invoice'),
  requirePermission('billing.invoice.create'),
  requirePermission('billing.invoice.issue'),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),ro=await one(id,r);
    if(!await permissionCoversAgency(r,'billing.invoice.create',String(ro.agency_id))||!await permissionCoversAgency(r,'billing.invoice.issue',String(ro.agency_id)))throw new HttpError(403,'Périmètre Billing insuffisant pour cette agence');
    if(!["ready","invoiced"].includes(ro.status)) throw new HttpError(409,"L'OR doit être prêt avant facturation");
    const businessConfig=await getEffectiveBusinessSettings(String(ro.agency_id));
    const invoiceId=await transaction(async c=>{
      const [lockedOrders]=await c.execute<RowDataPacket[]>("SELECT status FROM repair_orders WHERE id=? AND agency_id=? FOR UPDATE",[id,ro.agency_id]);
      if(!lockedOrders[0]||!["ready","invoiced"].includes(String(lockedOrders[0].status)))throw new HttpError(409,"L'OR n'est plus disponible pour facturation");
      const [existing]=await c.execute<RowDataPacket[]>("SELECT id FROM invoices WHERE repair_order_id=? AND status<>'cancelled'",[id]);
      if(existing[0]) return existing[0].id;
      const [totals]=await c.execute<RowDataPacket[]>("SELECT COALESCE(SUM(line_total),0) subtotal,COALESCE(SUM(line_total*tax_rate/100),0) tax FROM repair_order_items WHERE repair_order_id=? AND status='active'",[id]);
      const totalRow=totals[0]!;
      const subtotal=Number(totalRow.subtotal),tax=Number(totalRow.tax),total=subtotal+tax,no=await nextDocumentNumber(c,'FAC',String(ro.agency_id));
      const [inv]=await c.execute<ResultSetHeader>("INSERT INTO invoices(invoice_number,customer_id,agency_id,repair_order_id,invoice_type,status,issue_date,subtotal,tax_total,total,balance_due,currency_code,created_by)VALUES(?,?,?,?,'workshop','issued',CURDATE(),?,?,?,?,?,?)",[no,ro.customer_id,ro.agency_id,id,subtotal,tax,total,total,businessConfig.currencyCode,r.user!.sub]);
      await c.execute("INSERT INTO invoice_items(invoice_id,part_id,description,quantity,unit_price,discount,tax_rate,tax_amount,line_total) SELECT ?,part_id,description,quantity,unit_price,discount,tax_rate,line_total*tax_rate/100,line_total FROM repair_order_items WHERE repair_order_id=? AND status='active'",[inv.insertId,id]);
      await c.execute("UPDATE repair_orders SET status='invoiced',actual_total=? WHERE id=?",[total,id]);
      await c.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,?,'invoiced','Facture atelier émise',?)",[id,ro.status,r.user!.sub]); return inv.insertId;
    });
    emitToAgency(String(ro.agency_id),"workshop:invoiced",{repairOrderId:id,invoiceId:String(invoiceId)});
    emitToAgency(String(ro.agency_id),"billing:invoice-created",{invoiceId:String(invoiceId),repairOrderId:id,source:'workshop'});
    res.status(201).json({id:String(invoiceId)});
  }),
);
workshopRouter.post('/repair-orders/:id/quality-control',serviceAccess('service.order.quality_control'),asyncHandler(async(r,res)=>{
  const id=idOf(r.params.id),ro=await one(id,r);if(ro.status!=='quality_control')throw new HttpError(409,'OR non disponible pour le contrôle qualité');
  const result=String(r.body.result??'');if(!['passed','failed'].includes(result))throw new HttpError(400,'Résultat du contrôle qualité invalide');
  const checks=['plannedWorkCompleted','defectCorrected','noLeaks','levelsChecked','cleanlinessChecked'];if(result==='passed'&&!checks.every(k=>r.body[k]===true))throw new HttpError(400,'Toutes les vérifications obligatoires doivent être validées');
  const reason=txt(r.body.reason,'Motif',500,result==='failed');
  await transaction(async c=>{
    const[orders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(orders[0]?.status!=='quality_control')throw new HttpError(409,'OR non disponible pour le contrôle qualité');
    const[entries]=await c.execute<RowDataPacket[]>("SELECT COUNT(*) total FROM repair_order_status_history WHERE repair_order_id=? AND new_status='quality_control' FOR UPDATE",[id]);
    const[controls]=await c.execute<RowDataPacket[]>('SELECT COUNT(*) total FROM repair_quality_controls WHERE repair_order_id=? FOR UPDATE',[id]);if(Number(controls[0]?.total??0)>=Math.max(1,Number(entries[0]?.total??0)))throw new HttpError(409,'Le contrôle qualité de cette étape a déjà été enregistré');
    await c.execute('INSERT INTO repair_quality_controls(repair_order_id,planned_work_completed,defect_corrected,road_test_performed,no_leaks,levels_checked,cleanliness_checked,result,reason,observations,controlled_by)VALUES(?,?,?,?,?,?,?,?,?,?,?)',[id,Boolean(r.body.plannedWorkCompleted),Boolean(r.body.defectCorrected),Boolean(r.body.roadTestPerformed),Boolean(r.body.noLeaks),Boolean(r.body.levelsChecked),Boolean(r.body.cleanlinessChecked),result,reason,txt(r.body.observations,'Observations',5000),r.user!.sub]);
  });
  emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'quality-control',result});res.status(201).json(await detail(id,r));
}));
workshopRouter.post('/repair-orders/:id/handover',serviceAccess('service.order.handover'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),ro=await one(id,r);if(ro.status==='delivered'||ro.status==='closed')return res.json(await detail(id,r));if(ro.status!=='invoiced')throw new HttpError(409,"L'OR doit être facturé avant la remise");const customer=txt(r.body.customerName,'Client',200,true)!,signature=txt(r.body.signatureData,'Signature',200000,true)!,mileage=r.body.mileageOut==null?null:Number(r.body.mileageOut);if(mileage!=null&&(!Number.isInteger(mileage)||mileage<Number(ro.mileage_in??0)))throw new HttpError(409,'Le kilométrage de sortie doit être supérieur ou égal au kilométrage d’entrée');await transaction(async c=>{const [locked]=await c.execute<RowDataPacket[]>("SELECT status,customer_id,vehicle_id FROM repair_orders WHERE id=? FOR UPDATE",[id]);if(locked[0]?.status!=='invoiced')throw new HttpError(409,'Remise déjà traitée ou statut incompatible');if(String(locked[0].customer_id)!==String(ro.customer_id)||String(locked[0].vehicle_id)!==String(ro.vehicle_id))throw new HttpError(409,'Cohérence client/véhicule invalide');const[quality]=await c.execute<RowDataPacket[]>("SELECT result FROM repair_quality_controls WHERE repair_order_id=? ORDER BY controlled_at DESC LIMIT 1 FOR UPDATE",[id]);if(quality[0]?.result!=='passed')throw new HttpError(409,'Contrôle qualité validé obligatoire');const[invoices]=await c.execute<RowDataPacket[]>("SELECT id,status,balance_due FROM invoices WHERE repair_order_id=? AND status<>'cancelled' ORDER BY id DESC LIMIT 1 FOR UPDATE",[id]);if(!invoices[0])throw new HttpError(409,'La facture atelier est absente');assertFinanciallySettled(invoices[0].balance_due,'atelier');await c.execute('INSERT INTO repair_order_handovers(repair_order_id,customer_name,mileage_out,observations,signature_data,handed_over_by)VALUES(?,?,?,?,?,?)',[id,customer,mileage,txt(r.body.observations,'Observations',5000),signature,r.user!.sub]);await c.execute("UPDATE repair_orders SET status='delivered' WHERE id=?",[id]);await c.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,'invoiced','delivered','Remise du véhicule',?)",[id,r.user!.sub]);});emitToAgency(String(ro.agency_id),'workshop:status',{id,repairOrderId:id,agencyId:String(ro.agency_id),status:'delivered'});res.status(201).json(await detail(id,r));}));
workshopRouter.patch('/repair-orders/:id/advisor',serviceAccess('service.order.assign_advisor'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),ro=await one(id,r),advisor=idOf(r.body.advisorId);ensureWritable(ro);await transaction(async c=>{await assertAdvisorCandidate(c,advisor,String(ro.agency_id));await c.execute('UPDATE repair_orders SET advisor_id=? WHERE id=?',[advisor,id]);await c.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,?,?,'Réaffectation conseiller SAV',?)",[id,ro.status,ro.status,r.user!.sub]);});emitToUser(advisor,'workshop:assigned',{repairOrderId:id,agencyId:String(ro.agency_id)});emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'advisor'});res.json(await detail(id,r));}));
workshopRouter.post(
  "/repair-orders/:id/assign",
  serviceAccess('service.order.assign_technician'),
  workshopAssignmentAccess,
  asyncHandler(async (r, res) => {
    const id=idOf(r.params.id),ro=await one(id,r),bay=r.body.bayId?idOf(r.body.bayId):null,start=dateTime(r.body.startsAt,"Début"),end=dateTime(r.body.endsAt,"Fin");ensureWritable(ro);if(!await permissionCoversAgency(r,'workshop.plan',String(ro.agency_id))||!await permissionCoversAgency(r,'workshop.assign_technician',String(ro.agency_id))||bay&&!await permissionCoversAgency(r,'workshop.assign_bay',String(ro.agency_id)))throw new HttpError(403,'Périmètre d’affectation Atelier insuffisant');
    if(start>=end) throw new HttpError(400,"Le début doit précéder la fin");
    let assignedTechnician='';
    const scheduleId=await transaction(async c=>{
      const[lockedOrders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(lockedOrders[0]?.status!=='in_progress')throw new HttpError(409,'La planification est gelée pour cet OR');
      const tech=await resolveRepairTechnician(c,r.body.technicianId,String(ro.agency_id));assignedTechnician=tech;
      let bayCapacity=0;if(bay){const [bays]=await c.execute<RowDataPacket[]>("SELECT id,capacity FROM workshop_bays WHERE id=? AND agency_id=? AND status='available' FOR UPDATE",[bay,ro.agency_id]);if(!bays[0])throw new HttpError(400,"Pont indisponible dans cette agence");bayCapacity=Number(bays[0].capacity);}
      if(r.body.interventionId){const [i]=await c.execute<RowDataPacket[]>("SELECT id FROM interventions WHERE id=? AND repair_order_id=? FOR UPDATE",[idOf(r.body.interventionId),id]);if(!i[0])throw new HttpError(400,"Intervention étrangère à cet OR");}
      const [technicianCollisions]=await c.execute<RowDataPacket[]>("SELECT id FROM schedules WHERE agency_id=? AND status IN('planned','confirmed','in_progress') AND technician_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[ro.agency_id,tech,end,start]);
      if(technicianCollisions[0]) throw new HttpError(409,"Technicien déjà occupé sur ce créneau");
      if(bay){const [bayCollisions]=await c.execute<RowDataPacket[]>("SELECT id FROM schedules WHERE agency_id=? AND status IN('planned','confirmed','in_progress') AND bay_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[ro.agency_id,bay,end,start]);if(bayCollisions.length>=bayCapacity)throw new HttpError(409,"Capacité du pont atteinte sur ce créneau");}
      const [absences]=await c.execute<RowDataPacket[]>("SELECT id FROM technician_unavailabilities WHERE technician_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[tech,end,start]);
      if(absences[0]) throw new HttpError(409,"Technicien indisponible sur ce créneau");
      const [x]=await c.execute<ResultSetHeader>(`INSERT INTO schedules(agency_id,technician_id,bay_id,repair_order_id,intervention_id,starts_at,ends_at,status,notes,created_by)VALUES(?,?,?,?,?,?,?,'confirmed',?,?)`,[ro.agency_id,tech,bay,id,r.body.interventionId??null,start,end,txt(r.body.notes,"Notes",2000),r.user!.sub]);
      await c.execute("INSERT INTO workshop_schedule_history(schedule_id,action,new_values,changed_by)VALUES(?,'created',JSON_OBJECT('technicianId',?,'bayId',?,'startsAt',?,'endsAt',?),?)",[x.insertId,tech,bay,start,end,r.user!.sub]);if(r.body.interventionId)await c.execute("UPDATE interventions SET technician_id=?,status=IF(status='planned','assigned',status) WHERE id=?",[tech,idOf(r.body.interventionId)]); return x.insertId;
    });
    emitToAgency(String(ro.agency_id), "workshop:assigned", {
      repairOrderId: id,
      technicianId: assignedTechnician,
    });
    res.status(201).json({ id: String(scheduleId) });
  }),
);
workshopRouter.get(
  "/workshop/technicians",
  workshopAuthorize('workshop.technicians.view'),
  asyncHandler(async (r, res) => {
    const agency=workshopAgencyFromQuery(r);
    res.json(
      await query<RowDataPacket[]>(
        `SELECT t.*,CONCAT_WS(' ',u.first_name,u.last_name) name FROM technicians t JOIN users u ON u.id=t.user_id WHERE t.agency_id=? AND ${operationalCandidateSql('u')} ${r.query.includeInactive==='true'?'':'AND t.is_active=1'} ORDER BY name`,
        [agency],
      ),
    );
  }),
);
workshopRouter.get("/workshop/bays",workshopAuthorize('workshop.bay.view'),asyncHandler(async(r,res)=>{const s=workshopAgencyScope(r,'b');res.json(await query<RowDataPacket[]>(`SELECT b.*,EXISTS(SELECT 1 FROM work_sessions ws WHERE ws.bay_id=b.id AND ws.status IN('running','paused')) occupied_now FROM workshop_bays b WHERE ${s.sql} ORDER BY b.name`,s.p));}));
workshopRouter.post("/workshop/bays",workshopAuthorize('workshop.bay.manage'),asyncHandler(async(r,res)=>{if(workshopSupervisionOwnForbidden(r))throw new HttpError(403,'OWN ne permet pas de gérer les ponts');const agency=r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;await assertWorkshopAgencyScope(r,String(agency));const status=String(r.body.status??'available'),capacity=Number(r.body.capacity??1);if(!['available','maintenance','inactive'].includes(status))throw new HttpError(400,"Statut de pont invalide");if(!Number.isInteger(capacity)||capacity<1)throw new HttpError(400,"Capacité du pont invalide");const x=await execute("INSERT INTO workshop_bays(agency_id,name,bay_type,capacity,status)VALUES(?,?,?,?,?)",[agency,txt(r.body.name,"Nom",100,true),txt(r.body.bayType,"Type",100),capacity,status]);emitToAgency(String(agency),'workshop:resources-changed',{type:'bay'});res.status(201).json({id:String(x.insertId)});}));
workshopRouter.patch("/workshop/bays/:id",workshopAuthorize('workshop.bay.manage'),asyncHandler(async(r,res)=>{if(workshopSupervisionOwnForbidden(r))throw new HttpError(403,'OWN ne permet pas de gérer les ponts');const id=idOf(r.params.id),agency=r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;await assertWorkshopAgencyScope(r,String(agency));const status=txt(r.body.status,"Statut",20,true)!,capacity=r.body.capacity==null?null:Number(r.body.capacity);if(!['available','maintenance','inactive'].includes(status))throw new HttpError(400,"Statut de pont invalide");if(capacity!=null&&(!Number.isInteger(capacity)||capacity<1))throw new HttpError(400,"Capacité du pont invalide");if(status!=='available'){const[running]=await query<RowDataPacket[]>("SELECT id FROM work_sessions WHERE bay_id=? AND status IN('running','paused') LIMIT 1",[id]);if(running?.[0])throw new HttpError(409,"Un pont occupé ne peut pas être désactivé ou mis en maintenance")}const x=await execute("UPDATE workshop_bays SET name=COALESCE(NULLIF(?,''),name),bay_type=COALESCE(NULLIF(?,''),bay_type),capacity=COALESCE(?,capacity),status=? WHERE id=? AND agency_id=?",[txt(r.body.name,"Nom",100),txt(r.body.bayType,"Type",100),capacity,status,id,agency]);if(!x.affectedRows)throw new HttpError(404,"Pont introuvable");emitToAgency(String(agency),'workshop:resources-changed',{type:'bay',id});res.json({id,status});}));
workshopRouter.post("/workshop/technicians",workshopAuthorize('workshop.technicians.manage'),asyncHandler(async(r,res)=>{const user=idOf(r.body.userId),agency=workshopAgencyFromQuery(r);const [valid]=await query<RowDataPacket[]>(`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles role ON role.id=ur.role_id JOIN role_permissions rp ON rp.role_id=role.id JOIN permissions p ON p.id=rp.permission_id WHERE u.id=? AND u.agency_id=? AND u.is_active=1 AND role.is_active=TRUE AND p.code='workshop.session.track' AND p.is_active=TRUE AND ${operationalCandidateSql('u')}`,[user,agency]);if(!valid)throw new HttpError(400,"Utilisateur opérationnel invalide pour cette agence");const x=await execute("INSERT INTO technicians(user_id,agency_id,employee_code,specialty,hourly_rate,available_hours_per_day)VALUES(?,?,?,?,?,?)",[user,agency,txt(r.body.employeeCode,"Matricule",50),txt(r.body.specialty,"Spécialité",150),Number(r.body.hourlyRate??0),Number(r.body.availableHoursPerDay??8)]);emitToAgency(String(agency),'workshop:resources-changed',{type:'technician'});res.status(201).json({id:String(x.insertId)});}));
workshopRouter.patch("/workshop/technicians/:id",workshopAuthorize('workshop.technicians.manage'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),agency=workshopAgencyFromQuery(r);const x=await execute("UPDATE technicians SET employee_code=COALESCE(?,employee_code),specialty=COALESCE(?,specialty),hourly_rate=COALESCE(?,hourly_rate),available_hours_per_day=COALESCE(?,available_hours_per_day),is_active=COALESCE(?,is_active) WHERE id=? AND agency_id=?",[txt(r.body.employeeCode,"Matricule",50),txt(r.body.specialty,"Spécialité",150),r.body.hourlyRate??null,r.body.availableHoursPerDay??null,r.body.isActive??null,id,agency]);if(!x.affectedRows)throw new HttpError(404,"Technicien introuvable");emitToAgency(String(agency),'workshop:resources-changed',{type:'technician',id});res.json({id});}));
workshopRouter.post("/workshop/technicians/:id/unavailability",workshopAuthorize('workshop.plan'),asyncHandler(async(r,res)=>{if(workshopSupervisionOwnForbidden(r))throw new HttpError(403,'Le périmètre OWN ne permet pas de modifier le planning collectif');const tech=idOf(r.params.id),start=dateTime(r.body.startsAt,"Début"),end=dateTime(r.body.endsAt,"Fin");if(start>=end)throw new HttpError(400,"Créneau invalide");const [valid]=await query<RowDataPacket[]>("SELECT id,agency_id FROM technicians WHERE id=?",[tech]);if(!valid)throw new HttpError(404,"Technicien introuvable");const agency=String(valid.agency_id);await assertWorkshopAgencyScope(r,agency);const x=await execute("INSERT INTO technician_unavailabilities(technician_id,starts_at,ends_at,reason,created_by)VALUES(?,?,?,?,?)",[tech,start,end,txt(r.body.reason,"Motif",255),r.user!.sub]);emitToAgency(agency,'workshop:resources-changed',{type:'unavailability'});res.status(201).json({id:String(x.insertId)});}));
workshopRouter.get("/workshop/unavailabilities",workshopAuthorize('workshop.schedule.view'),asyncHandler(async(r,res)=>{const from=isoDate(r.query.from,"Date de début"),to=isoDate(r.query.to,"Date de fin"),periodStart=`${from} 00:00:00`,periodEnd=`${to} 23:59:59`,scopeFilter=workshopScope(r,'t');const params:any[]=[...scopeFilter.p,periodEnd,periodStart];let filter="";if(r.query.technicianId){filter=" AND tu.technician_id=?";params.push(idOf(r.query.technicianId));}res.json(await query<RowDataPacket[]>(`SELECT tu.*,CONCAT_WS(' ',u.first_name,u.last_name) technician_name FROM technician_unavailabilities tu JOIN technicians t ON t.id=tu.technician_id JOIN users u ON u.id=t.user_id WHERE ${scopeFilter.sql} AND tu.starts_at<? AND tu.ends_at>?${filter} ORDER BY tu.starts_at`,params));}));
workshopRouter.delete("/workshop/unavailabilities/:id",workshopAuthorize('workshop.plan'),asyncHandler(async(r,res)=>{if(workshopSupervisionOwnForbidden(r))throw new HttpError(403,'Le périmètre OWN ne permet pas de modifier le planning collectif');const id=idOf(r.params.id);const [target]=await query<RowDataPacket[]>("SELECT t.agency_id FROM technician_unavailabilities tu JOIN technicians t ON t.id=tu.technician_id WHERE tu.id=?",[id]);if(!target)throw new HttpError(404,"Indisponibilité introuvable");const agency=String(target.agency_id);await assertWorkshopAgencyScope(r,agency);await execute("DELETE FROM technician_unavailabilities WHERE id=?",[id]);emitToAgency(agency,'workshop:resources-changed',{type:'unavailability',id});res.json({id});}));
workshopRouter.get(
  "/workshop/planning",
  workshopAuthorize('workshop.schedule.view'),
  asyncHandler(async (r, res) => {
    const from=isoDate(r.query.from??r.query.date,"Date de début"),to=isoDate(r.query.to??r.query.date,"Date de fin"),periodStart=`${from} 00:00:00`,periodEnd=`${to} 23:59:59`,scopeFilter=workshopScope(r,'s');
    const where=[scopeFilter.sql,"s.starts_at<?","s.ends_at>?"],params:any[]=[...scopeFilter.p,periodEnd,periodStart];
    if(r.query.technicianId){where.push("s.technician_id=?");params.push(idOf(r.query.technicianId));}if(r.query.bayId){where.push("s.bay_id=?");params.push(idOf(r.query.bayId));}if(r.query.status){where.push("s.status=?");params.push(r.query.status);}
    res.json(
      await query<RowDataPacket[]>(
        `SELECT s.*,ro.order_number,ro.status repair_order_status,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,v.registration_number,CONCAT(br.name,' ',m.name,' ',ve.name) vehicle_label,t.employee_code,CONCAT_WS(' ',u.first_name,u.last_name) technician_name,b.name bay_name,b.status bay_status,b.capacity bay_capacity,EXISTS(SELECT 1 FROM work_sessions ws WHERE ws.bay_id=b.id AND ws.status='running') bay_occupied_now,i.description intervention_description FROM schedules s LEFT JOIN repair_orders ro ON ro.id=s.repair_order_id LEFT JOIN customers c ON c.id=ro.customer_id LEFT JOIN vehicles v ON v.id=ro.vehicle_id LEFT JOIN versions ve ON ve.id=v.version_id LEFT JOIN models m ON m.id=ve.model_id LEFT JOIN brands br ON br.id=m.brand_id LEFT JOIN interventions i ON i.id=s.intervention_id LEFT JOIN technicians t ON t.id=s.technician_id LEFT JOIN users u ON u.id=t.user_id LEFT JOIN workshop_bays b ON b.id=s.bay_id WHERE ${where.join(' AND ')} ORDER BY s.starts_at`,params,
      ),
    );
  }),
);
workshopRouter.get('/workshop/interventions/history',workshopAuthorize('workshop.intervention.view'),asyncHandler(async(r,res)=>{
  const scoped=workshopInterventionScope(r),params:any[]=[...scoped.p];let repairOrderFilter='';
  if(r.query.repairOrderId){repairOrderFilter=' AND i.repair_order_id=?';params.push(idOf(r.query.repairOrderId));}
  res.json(await query<RowDataPacket[]>(`SELECT i.id,i.repair_order_id,i.description,i.status,i.actual_hours,ro.order_number,CONCAT_WS(' ',u.first_name,u.last_name) technician_name,COALESCE(sess.bay_names,plan.bay_names,'') bay_names,COALESCE(sess.started_at,plan.starts_at) started_at,COALESCE(sess.ended_at,plan.ends_at) ended_at,COALESCE(te.duration_hours,i.actual_hours,0) duration_hours FROM interventions i JOIN repair_orders ro ON ro.id=i.repair_order_id LEFT JOIN technicians t ON t.id=i.technician_id LEFT JOIN users u ON u.id=t.user_id LEFT JOIN (SELECT ws.intervention_id,MIN(ws.started_at) started_at,MAX(ws.ended_at) ended_at,GROUP_CONCAT(DISTINCT b.name ORDER BY b.name SEPARATOR ', ') bay_names FROM work_sessions ws LEFT JOIN workshop_bays b ON b.id=ws.bay_id GROUP BY ws.intervention_id) sess ON sess.intervention_id=i.id LEFT JOIN (SELECT s.intervention_id,MIN(s.starts_at) starts_at,MAX(s.ends_at) ends_at,GROUP_CONCAT(DISTINCT b.name ORDER BY b.name SEPARATOR ', ') bay_names FROM schedules s LEFT JOIN workshop_bays b ON b.id=s.bay_id WHERE s.status<>'cancelled' GROUP BY s.intervention_id) plan ON plan.intervention_id=i.id LEFT JOIN (SELECT intervention_id,SUM(hours) duration_hours FROM time_entries GROUP BY intervention_id) te ON te.intervention_id=i.id WHERE ${scoped.sql}${repairOrderFilter} ORDER BY i.id DESC`,params));
}));
workshopRouter.get("/workshop/stats",workshopAuthorize('workshop.productivity.view'),asyncHandler(async(r,res)=>{const from=isoDate(r.query.from??r.query.date,"Date de début"),to=isoDate(r.query.to??r.query.date,"Date de fin"),periodStart=`${from} 00:00:00`,periodEnd=`${to} 23:59:59`,filters=productivityFilters(r);const [[technicians],[schedules],[actual],[bays]]=await Promise.all([query<RowDataPacket[]>(`SELECT COUNT(*) technicians,COALESCE(SUM(t.available_hours_per_day),0) technician_daily_capacity FROM technicians t WHERE t.is_active=1 AND ${filters.technician.sql}`,filters.technician.p),query<RowDataPacket[]>(`SELECT COUNT(DISTINCT s.id) assignments,COALESCE(SUM(TIMESTAMPDIFF(MINUTE,GREATEST(s.starts_at,?),LEAST(s.ends_at,?)))/60,0) scheduled_hours FROM schedules s WHERE s.status<>'cancelled' AND s.starts_at<? AND s.ends_at>? AND ${filters.schedule.sql}`,[periodStart,periodEnd,periodEnd,periodStart,...filters.schedule.p]),query<RowDataPacket[]>(`SELECT COALESCE(SUM(te.hours),0) actual_hours FROM time_entries te JOIN technicians t ON t.id=te.technician_id WHERE te.entry_date BETWEEN ? AND ? AND ${filters.technician.sql}`,[from,to,...filters.technician.p]),query<RowDataPacket[]>(`SELECT COUNT(*) bays,COALESCE(SUM(b.capacity),0) bay_units FROM workshop_bays b WHERE b.status='available' AND ${filters.bay.sql}`,filters.bay.p)]);const days=Math.max(1,Math.round((Date.parse(to)-Date.parse(from))/86400000)+1),capacity=Number(technicians?.technician_daily_capacity??0)*days,bayCapacity=filters.personal?0:Number(bays?.bay_units??0)*8*days,scheduled=Number(schedules?.scheduled_hours??0),actualHours=Number(actual?.actual_hours??0);res.json({technicians:Number(technicians?.technicians??0),bays:filters.personal?0:Number(bays?.bays??0),assignments:Number(schedules?.assignments??0),scheduled_hours:scheduled,actual_hours:actualHours,capacity_hours:capacity,bay_capacity_hours:bayCapacity,technician_occupation_rate:capacity?Math.round(scheduled/capacity*100):0,bay_occupation_rate:bayCapacity?Math.round(scheduled/bayCapacity*100):0,productivity_rate:scheduled?Math.round(actualHours/scheduled*100):0,personal:filters.personal});}));
workshopRouter.patch("/workshop/schedules/:id",workshopAssignmentAccess,asyncHandler(async(r,res)=>{const schedule=idOf(r.params.id),tech=idOf(r.body.technicianId),bay=r.body.bayId?idOf(r.body.bayId):null,start=dateTime(r.body.startsAt,"Début"),end=dateTime(r.body.endsAt,"Fin");if(start>=end)throw new HttpError(400,"Créneau invalide");const [target]=await query<RowDataPacket[]>("SELECT agency_id FROM schedules WHERE id=?",[schedule]);if(!target)throw new HttpError(404,"Affectation introuvable");const agency=String(target.agency_id);await assertWorkshopAgencyScope(r,agency);if(!await permissionCoversAgency(r,'workshop.assign_technician',agency)||bay&&!await permissionCoversAgency(r,'workshop.assign_bay',agency))throw new HttpError(403,'Périmètre d’affectation Atelier insuffisant');await transaction(async c=>{const [oldRows]=await c.execute<RowDataPacket[]>(`SELECT * FROM schedules WHERE id=? AND agency_id=? FOR UPDATE`,[schedule,agency]);const old=oldRows[0];if(!old)throw new HttpError(404,"Affectation introuvable");const [activeSessions]=await c.execute<RowDataPacket[]>("SELECT id FROM work_sessions WHERE intervention_id=? AND status IN('running','paused') FOR UPDATE",[old.intervention_id]);if(activeSessions[0]&&(String(old.technician_id)!==tech||String(old.bay_id??'')!==String(bay??'')))throw new HttpError(409,"Une session active interdit la réaffectation des ressources");const [resources]=await c.execute<RowDataPacket[]>(`SELECT t.id,b.capacity FROM technicians t JOIN users u ON u.id=t.user_id AND u.is_active=TRUE JOIN user_roles ur ON ur.user_id=u.id JOIN roles role ON role.id=ur.role_id AND role.is_active=TRUE JOIN role_permissions rp ON rp.role_id=role.id JOIN permissions p ON p.id=rp.permission_id AND p.code='workshop.session.track' AND p.is_active=TRUE LEFT JOIN workshop_bays b ON b.id=? AND b.agency_id=t.agency_id AND b.status='available' WHERE t.id=? AND t.agency_id=? AND t.is_active=1 AND ${operationalCandidateSql('u')} AND (? IS NULL OR b.id IS NOT NULL) LIMIT 1 FOR UPDATE`,[bay,tech,agency,bay]);if(!resources[0])throw new HttpError(400,"Ressource atelier invalide");const [technicianCollision]=await c.execute<RowDataPacket[]>("SELECT id FROM schedules WHERE id<>? AND agency_id=? AND status<>'cancelled' AND technician_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[schedule,agency,tech,end,start]);if(technicianCollision[0])throw new HttpError(409,"Technicien déjà occupé sur ce créneau");if(bay){const [bayCollisions]=await c.execute<RowDataPacket[]>("SELECT id FROM schedules WHERE id<>? AND agency_id=? AND status<>'cancelled' AND bay_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[schedule,agency,bay,end,start]);if(bayCollisions.length>=Number(resources[0].capacity))throw new HttpError(409,"Capacité du pont atteinte sur ce créneau");}const [absence]=await c.execute<RowDataPacket[]>("SELECT id FROM technician_unavailabilities WHERE technician_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[tech,end,start]);if(absence[0])throw new HttpError(409,"Technicien indisponible sur ce créneau");await c.execute("UPDATE schedules SET technician_id=?,bay_id=?,starts_at=?,ends_at=?,notes=COALESCE(?,notes) WHERE id=?",[tech,bay,start,end,txt(r.body.notes,"Notes",2000),schedule]);await c.execute("INSERT INTO workshop_schedule_history(schedule_id,action,old_values,new_values,changed_by)VALUES(?,'updated',?,JSON_OBJECT('technicianId',?,'bayId',?,'startsAt',?,'endsAt',?),?)",[schedule,JSON.stringify(old),tech,bay,start,end,r.user!.sub]);});emitToAgency(agency,'workshop:schedule-updated',{id:schedule});res.json({id:schedule});}));
workshopRouter.delete("/workshop/schedules/:id",workshopAuthorize('workshop.plan'),asyncHandler(async(r,res)=>{if(workshopSupervisionOwnForbidden(r))throw new HttpError(403,'Le périmètre OWN ne permet pas de modifier le planning collectif');const id=idOf(r.params.id);const [target]=await query<RowDataPacket[]>("SELECT agency_id FROM schedules WHERE id=?",[id]);if(!target)throw new HttpError(404,"Affectation active introuvable");const agency=String(target.agency_id);await assertWorkshopAgencyScope(r,agency);await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>("SELECT * FROM schedules WHERE id=? AND agency_id=? AND status<>'cancelled' FOR UPDATE",[id,agency]);if(!rows[0])throw new HttpError(404,"Affectation active introuvable");const [activeSessions]=await c.execute<RowDataPacket[]>("SELECT id FROM work_sessions WHERE intervention_id=? AND status IN('running','paused') FOR UPDATE",[rows[0].intervention_id]);if(activeSessions[0])throw new HttpError(409,"Une session active interdit l’annulation du planning");await c.execute("UPDATE schedules SET status='cancelled' WHERE id=?",[id]);await c.execute("INSERT INTO workshop_schedule_history(schedule_id,action,old_values,new_values,changed_by)VALUES(?,'cancelled',?,JSON_OBJECT('status','cancelled'),?)",[id,JSON.stringify(rows[0]),r.user!.sub]);});emitToAgency(agency,'workshop:schedule-cancelled',{id});res.json({id,status:'cancelled'});}));
workshopRouter.post(
  "/repair-orders/:id/sessions/start",
  workshopAuthorize('workshop.session.track'),
  asyncHandler(async (r, res) => {
    const id=idOf(r.params.id),ro=await one(id,r),intervention=idOf(r.body.interventionId),bay=r.body.bayId?idOf(r.body.bayId):null;if(ro.status!=='in_progress')throw new HttpError(409,"L'OR doit être en cours pour démarrer une session");
    const sessionId=await transaction(async c=>{const[lockedOrders]=await c.execute<RowDataPacket[]>('SELECT status FROM repair_orders WHERE id=? FOR UPDATE',[id]);if(lockedOrders[0]?.status!=='in_progress')throw new HttpError(409,'Le démarrage est gelé pour cet OR');const requested=await resolveRepairTechnician(c,r.body.technicianId,String(ro.agency_id));const [techs]=await c.execute<RowDataPacket[]>('SELECT user_id FROM technicians WHERE id=? FOR UPDATE',[requested]);const tech=techs[0];if(workshopOwnTechnician(r,String(tech!.user_id)))throw new HttpError(403,"Le périmètre OWN ne permet que son propre pointage");const [interventions]=await c.execute<RowDataPacket[]>("SELECT id,technician_id,status FROM interventions WHERE id=? AND repair_order_id=? FOR UPDATE",[intervention,id]);const work=interventions[0];if(!work||['completed','cancelled'].includes(work.status))throw new HttpError(400,"Intervention non disponible");if(!work.technician_id||String(work.technician_id)!==requested)throw new HttpError(409,"L'intervention doit être affectée à ce technicien");if(bay){const [bays]=await c.execute<RowDataPacket[]>("SELECT id FROM workshop_bays WHERE id=? AND agency_id=? AND status='available' FOR UPDATE",[bay,ro.agency_id]);if(!bays[0])throw new HttpError(400,"Pont indisponible dans cette agence");}const [running]=await c.execute<RowDataPacket[]>("SELECT id FROM work_sessions WHERE (technician_id=? OR (? IS NOT NULL AND bay_id=?)) AND status IN('running','paused') FOR UPDATE",[requested,bay,bay]);if(running[0])throw new HttpError(409,"Technicien ou pont déjà en activité");const [x]=await c.execute<ResultSetHeader>(`INSERT INTO work_sessions(repair_order_id,technician_id,intervention_id,bay_id,started_at,status,created_by)VALUES(?,?,?,?,NOW(),'running',?)`,[id,requested,intervention,bay,r.user!.sub]);await c.execute("UPDATE interventions SET status='in_progress' WHERE id=?",[intervention]);await c.execute("INSERT INTO workshop_session_history(session_id,action,new_values,changed_by)VALUES(?,'started',JSON_OBJECT('technicianId',?,'interventionId',?,'bayId',?),?)",[x.insertId,requested,intervention,bay,r.user!.sub]);return x.insertId;});emitToUser(String(r.user!.sub),'workshop:session-started',{repairOrderId:id,agencyId:String(ro.agency_id),sessionId:String(sessionId),interventionId:intervention});emitToAgency(String(ro.agency_id),'workshop:session-started',{repairOrderId:id,agencyId:String(ro.agency_id),sessionId:String(sessionId),interventionId:intervention});res.status(201).json({id:String(sessionId)});
  }),
);
workshopRouter.patch('/repair-orders/:id/sessions/:sessionId/pause',workshopAuthorize('workshop.session.track'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),session=idOf(r.params.sessionId),ro=await one(id,r);await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>("SELECT ws.*,t.user_id,t.agency_id FROM work_sessions ws JOIN technicians t ON t.id=ws.technician_id WHERE ws.id=? AND ws.repair_order_id=? FOR UPDATE",[session,id]);const ws=rows[0];if(!ws)throw new HttpError(404,'Session introuvable');if(ws.status!=='running')throw new HttpError(409,'Seule une session active peut être mise en pause');if(String(ws.agency_id)!==String(ro.agency_id)||workshopOwnTechnician(r,String(ws.user_id)))throw new HttpError(403,'Session hors périmètre');await c.execute("UPDATE work_sessions SET status='paused',paused_at=NOW() WHERE id=?",[session]);await c.execute("INSERT INTO workshop_session_history(session_id,action,old_values,new_values,changed_by)VALUES(?,'paused',JSON_OBJECT('status','running'),JSON_OBJECT('status','paused','pausedAt',NOW()),?)",[session,r.user!.sub]);});emitToAgency(String(ro.agency_id),'workshop:session-paused',{repairOrderId:id,sessionId:session});res.json({id:session,status:'paused'});}));
workshopRouter.patch('/repair-orders/:id/sessions/:sessionId/resume',workshopAuthorize('workshop.session.track'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),session=idOf(r.params.sessionId),ro=await one(id,r);if(ro.status!=='in_progress')throw new HttpError(409,"L'OR n'autorise pas la reprise du pointage");await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>("SELECT ws.*,t.user_id,t.agency_id FROM work_sessions ws JOIN technicians t ON t.id=ws.technician_id WHERE ws.id=? AND ws.repair_order_id=? FOR UPDATE",[session,id]);const ws=rows[0];if(!ws)throw new HttpError(404,'Session introuvable');if(ws.status!=='paused'||!ws.paused_at)throw new HttpError(409,'Seule une session en pause peut être reprise');if(String(ws.agency_id)!==String(ro.agency_id)||workshopOwnTechnician(r,String(ws.user_id)))throw new HttpError(403,'Session hors périmètre');const [other]=await c.execute<RowDataPacket[]>("SELECT id FROM work_sessions WHERE id<>? AND technician_id=? AND status='running' FOR UPDATE",[session,ws.technician_id]);if(other[0])throw new HttpError(409,'Une autre session est déjà active');await c.execute("UPDATE work_sessions SET status='running',accumulated_pause_seconds=accumulated_pause_seconds+GREATEST(TIMESTAMPDIFF(SECOND,paused_at,NOW()),0),paused_at=NULL WHERE id=?",[session]);await c.execute("INSERT INTO workshop_session_history(session_id,action,old_values,new_values,changed_by)VALUES(?,'resumed',JSON_OBJECT('status','paused'),JSON_OBJECT('status','running','resumedAt',NOW()),?)",[session,r.user!.sub]);});emitToAgency(String(ro.agency_id),'workshop:session-resumed',{repairOrderId:id,sessionId:session});res.json({id:session,status:'running'});}));
workshopRouter.patch(
  "/repair-orders/:id/sessions/:sessionId/stop",
  workshopAnyAccess(['workshop.session.track','workshop.session.manage']),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),
      session = idOf(r.params.sessionId);
    const ro=await one(id,r);if(!['in_progress','abandonment_pending'].includes(ro.status))throw new HttpError(409,"L'OR n'autorise pas le pointage");const changed=await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>("SELECT ws.*,t.user_id,t.agency_id FROM work_sessions ws JOIN technicians t ON t.id=ws.technician_id WHERE ws.id=? AND ws.repair_order_id=? FOR UPDATE",[session,id]);const ws=rows[0];if(!ws)throw new HttpError(404,"Session introuvable");if(ws.status==='completed')return false;if(!['running','paused'].includes(ws.status))throw new HttpError(409,"Cette session ne peut pas être arrêtée");if(String(ws.agency_id)!==String(ro.agency_id))throw new HttpError(403,"Session hors agence");if(workshopOwnTechnician(r,String(ws.user_id)))throw new HttpError(403,"Le périmètre OWN ne permet que son propre pointage");const pausedTail=ws.status==='paused'&&ws.paused_at?'GREATEST(TIMESTAMPDIFF(SECOND,paused_at,NOW()),0)':'0';await c.execute("UPDATE work_sessions SET ended_at=NOW(),status='completed',accumulated_pause_seconds=accumulated_pause_seconds+"+pausedTail+",paused_at=NULL WHERE id=?",[session]);await c.execute("INSERT INTO time_entries(technician_id,repair_order_id,intervention_id,work_session_id,entry_date,hours,productive,notes) SELECT technician_id,repair_order_id,intervention_id,id,CURDATE(),GREATEST((TIMESTAMPDIFF(SECOND,started_at,NOW())-accumulated_pause_seconds)/3600,0),TRUE,'Session atelier' FROM work_sessions WHERE id=?",[session]);await c.execute("INSERT INTO workshop_session_history(session_id,action,old_values,new_values,changed_by)VALUES(?,'stopped',JSON_OBJECT('status',?),JSON_OBJECT('status','completed','endedAt',NOW()),?)",[session,ws.status,r.user!.sub]);if(ws.intervention_id)await c.execute("UPDATE interventions SET actual_hours=(SELECT COALESCE(SUM(hours),0) FROM time_entries WHERE intervention_id=?),status='in_progress' WHERE id=?",[ws.intervention_id,ws.intervention_id]);return true;});if(changed)emitToAgency(String(ro.agency_id),'workshop:session-stopped',{repairOrderId:id,agencyId:String(ro.agency_id),sessionId:session});
    res.json(await detail(id, r));
  }),
);
workshopRouter.patch('/workshop/time-entries/:id',workshopAuthorize('workshop.time.adjust'),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),hours=Number(r.body.hours),reason=txt(r.body.reason,'Motif',500,true)!;if(!Number.isFinite(hours)||hours<0)throw new HttpError(400,'Durée invalide');await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>("SELECT te.*,t.agency_id FROM time_entries te JOIN technicians t ON t.id=te.technician_id WHERE te.id=? FOR UPDATE",[id]);const entry=rows[0];if(!entry)throw new HttpError(404,'Temps introuvable');await assertWorkshopAgencyScope(r,String(entry.agency_id));await c.execute('UPDATE time_entries SET hours=?,notes=CONCAT(COALESCE(notes,\'\'),?) WHERE id=?',[hours,`\nCorrection: ${reason}`,id]);await c.execute("INSERT INTO workshop_session_history(session_id,action,old_values,new_values,reason,changed_by)VALUES(?,'adjusted',JSON_OBJECT('hours',?),JSON_OBJECT('hours',?),?,?)",[entry.work_session_id,entry.hours,hours,reason,r.user!.sub]);if(entry.intervention_id)await c.execute('UPDATE interventions SET actual_hours=(SELECT COALESCE(SUM(hours),0) FROM time_entries WHERE intervention_id=?) WHERE id=?',[entry.intervention_id,entry.intervention_id]);});res.json({id,hours});}));
workshopRouter.get(
  "/repair-orders/:id/pdf",
  serviceAccess('service.documents.view'),
  asyncHandler(async (r, res) => {
    const ro = await detail(idOf(r.params.id), r),pdf=await renderRepairOrderDocument(ro);
    res
      .type("pdf")
      .setHeader(
        "Content-Disposition",
        `inline; filename="${ro.order_number}.pdf"`,
      );
    res.send(pdf);
  }),
);
