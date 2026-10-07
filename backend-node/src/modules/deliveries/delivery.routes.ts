import { unlink } from "node:fs/promises";
import path from "node:path";
import { Router, type Request } from "express";
import {archiveDelivery,archiveDeliveryInTransaction,requireBusinessArchive,requiredHistoricalBusinessPdf} from "../documents/business-document.service.js";
import {defaultDocumentIdentity,documentIdentityForAgency,renderDeliveryDocument,renderDeliveryPlanningDocumentData} from "../documents/commercial-document.js";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, transaction } from "../../config/database.js";
import { requireAnyPermission, requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { emitToAgency } from "../../realtime/socket.js";
import { HttpError } from "../../shared/http-error.js";
import { notifyPermissions as createPermissionNotifications } from "../notifications/notification.service.js";
import {assertHandoverMileage,deliverySignatureHash} from './delivery.domain.js';
import {operationalCandidateSql} from '../users/operational-candidate.js';
import {requireDocumentFile,storeDocument} from '../documents/document-storage.js';
import {decodeDeliveryDocument} from './delivery-document.js';
import{lockActiveSaleInvoice,useDeliveryFinancialAuthorization}from'../billing/sale-financial-gate.js';
import{activateAtDelivery}from'../sales/vehicle-warranty.service.js';
import{writeAudit}from'../activity/audit-writer.js';
import{pageMeta,pageRequest,paged}from'../../shared/pagination.js';
import{createDeliveryChecklistSnapshot,lockAndAssertDeliveryChecklistComplete,readDeliveryChecklist}from'./delivery-checklist.service.js';

export const deliveryRouter = Router();
export const deliverySignTestHooks:{afterMarksLocked?:()=>Promise<void>;afterDocumentRealtime?: (documentId:string)=>void}={};
type DeliveryPermission='delivery.view'|'delivery.prepare'|'delivery.schedule'|'delivery.checklist.view'|'delivery.checklist.manage'|'delivery.documents.view'|'delivery.signature.capture'|'delivery.complete'|'delivery.cancel'|'delivery.financial_override.authorize';
const STATUSES = [
  "planned",
  "preparing",
  "quality_control",
  "ready",
  "delivered",
  "cancelled",
];
const ALLOWED: Record<string, string[]> = {
  planned: ["preparing", "cancelled"],
  preparing: ["quality_control", "cancelled"],
  quality_control: ["preparing", "ready", "cancelled"],
  ready: ["preparing", "delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
const DELIVERY_DOCUMENT_PERMISSIONS:DeliveryPermission[]=['delivery.documents.view','delivery.checklist.manage'];
const idOf = (value: string | string[] | undefined) => {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id || !/^[1-9]\d*$/.test(id))
    throw new HttpError(400, "Identifiant invalide");
  return id;
};
const text = (value: unknown, label: string, max = 500, required = false) => {
  const result = String(value ?? "").trim();
  if (required && !result) throw new HttpError(400, `${label} est requis`);
  if (result.length > max) throw new HttpError(400, `${label} est trop long`);
  return result || null;
};
const mysqlDateTime = (value: unknown, label: string) => {
  const parsed = new Date(String(value ?? ""));
  if (Number.isNaN(parsed.getTime())) throw new HttpError(400, `${label} invalide`);
  return parsed.toISOString().slice(0, 19).replace("T", " ");
};
const permissionScope=(request:Request,permission:DeliveryPermission)=>request.rbac?.permissions.get(permission);
const authorizationScope=(request:Request,alias='s')=>{const value=permissionScope(request,'delivery.financial_override.authorize');if(value==='OWN')throw new HttpError(403,'Le périmètre OWN ne permet pas une autorisation financière collective.');return scope(request,'delivery.financial_override.authorize',alias)};
async function canViewFinancials(request:Request,agencyId:unknown){
  const value=request.rbac?.permissions.get('billing.payment.view');
  if(value==='GLOBAL')return true;
  if(!request.user?.agencyId)return false;
  if(value==='AGENCY')return String(agencyId)===String(request.user.agencyId);
  if(value==='CONCESSION'){const rows=await query<RowDataPacket[]>('SELECT a.id FROM agencies a JOIN agencies current ON current.concession_id=a.concession_id WHERE a.id=? AND current.id=?',[agencyId,request.user.agencyId]);return Boolean(rows[0])}
  return false;
}
const agency = (request: Request, permission:DeliveryPermission, requested?: unknown) => {
  if (permissionScope(request,permission)==='GLOBAL' && requested) return idOf(String(requested));
  if (!request.user?.agencyId)
    throw new HttpError(403, "Aucune agence associée");
  return request.user.agencyId;
};
const scope=(request:Request,permission:DeliveryPermission,alias='d')=>{const value=permissionScope(request,permission);if(value==='GLOBAL')return{sql:'1=1',params:[] as unknown[]};if(value==='CONCESSION')return{sql:`${alias}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`,params:[request.user!.agencyId]};if(value==='AGENCY')return{sql:`${alias}.agency_id=?`,params:[request.user!.agencyId]};if(value==='OWN'&&alias==='d')return{sql:`${alias}.delivery_specialist_id=?`,params:[request.user!.sub]};if(value==='OWN')return{sql:'1=0',params:[] as unknown[]};throw new HttpError(403,'Périmètre Livraison insuffisant.');};
const selection = `SELECT d.*,s.sale_number,s.status sale_status,s.total sale_total,COALESCE((SELECT SUM(i.balance_due) FROM invoices i WHERE i.sale_id=s.id AND i.status NOT IN('draft','cancelled')),s.balance_due) balance_due,COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.sale_id=s.id AND i.status NOT IN('draft','cancelled') AND i.invoice_type='other'),0) delivery_services_total,COALESCE((SELECT SUM(i.balance_due) FROM invoices i WHERE i.sale_id=s.id AND i.status NOT IN('draft','cancelled') AND i.invoice_type='other'),0) delivery_services_balance,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,c.phone,c.email,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,v.vin,v.registration_number,v.mileage vehicle_mileage,vwc.decision warranty_decision,vwc.status warranty_status,vwc.provider_name_snapshot warranty_provider_name,vwc.duration_months warranty_duration_months,vwc.mileage_limit warranty_mileage_limit,vwc.start_date warranty_start_date,vwc.expiry_date warranty_expiry_date,vwc.initial_mileage warranty_initial_mileage,vwc.activated_at warranty_activated_at,CONCAT_WS(' ',sp.first_name,sp.last_name) salesperson_name,CONCAT_WS(' ',du.first_name,du.last_name) delivery_specialist_name,a.name agency_name FROM deliveries d JOIN sales s ON s.id=d.sale_id JOIN customers c ON c.id=d.customer_id JOIN vehicles v ON v.id=d.vehicle_id JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id LEFT JOIN vehicle_warranty_contracts vwc ON vwc.sale_id=s.id AND vwc.vehicle_id=v.id LEFT JOIN users sp ON sp.id=s.salesperson_id LEFT JOIN users du ON du.id=d.delivery_specialist_id JOIN agencies a ON a.id=d.agency_id`;

async function accessible(id: string, request: Request, permission:DeliveryPermission): Promise<any> {
  const scoped = scope(request,permission);
  const [row] = await query<RowDataPacket[]>(
    `${selection} WHERE d.id=? AND ${scoped.sql}`,
    [id, ...scoped.params],
  );
  if (!row) throw new HttpError(404, "Livraison introuvable");
  const[authorization]=await query<RowDataPacket[]>(`${authorizationSelect} WHERE fa.sale_id=? ORDER BY (fa.status='AUTHORIZED') DESC,fa.id DESC LIMIT 1`,[row.sale_id]);
  const balance=Number(row.balance_due),covered=authorization?.status==='AUTHORIZED'&&balance>0&&balance<=Number(authorization.balance_due_snapshot)+.001;
  return {...row,financially_cleared:balance<=.001||covered,financial_authorization:authorization??null,balance_due:await canViewFinancials(request,row.agency_id)?row.balance_due:null};
}
async function canAccessNested(id:string,request:Request,permissions:DeliveryPermission[]){
  for(const permission of permissions){
    if(!request.rbac?.permissions.has(permission))continue;
    const scoped=scope(request,permission);
    const rows=await query<RowDataPacket[]>(`SELECT d.id FROM deliveries d WHERE d.id=? AND ${scoped.sql} LIMIT 1`,[id,...scoped.params]);
    if(rows[0])return true;
  }
  return false;
}
async function detail(id: string, request: Request, permission:DeliveryPermission='delivery.view'): Promise<any> {
  const row = await accessible(id, request,permission);
  const [canChecklist,canDocuments,canSignature]=await Promise.all([
    canAccessNested(id,request,['delivery.checklist.view','delivery.checklist.manage']),
    canAccessNested(id,request,['delivery.documents.view','delivery.checklist.manage']),
    canAccessNested(id,request,['delivery.signature.capture','delivery.complete']),
  ]);
  const canServices=Boolean(request.rbac?.permissions.has('delivery.service.view')||request.rbac?.permissions.has('delivery.service.add'));
  const [checklistCategories, documents, signatures, history,services] = await Promise.all([
    canChecklist?readDeliveryChecklist(id):Promise.resolve([]),
    canDocuments?query<RowDataPacket[]>(
      "SELECT dd.*,CONCAT_WS(' ',u.first_name,u.last_name) received_by_name FROM delivery_documents dd LEFT JOIN users u ON u.id=dd.received_by WHERE dd.delivery_id=? ORDER BY dd.id",
      [id],
    ):Promise.resolve([]),
    canSignature?query<RowDataPacket[]>(
      "SELECT id,signer_name,signed_by,signature_data,consent_text,document_hash,signed_at,ip_address FROM delivery_signatures WHERE delivery_id=? ORDER BY signed_at DESC",
      [id],
    ):Promise.resolve([]),
    query<RowDataPacket[]>(
      "SELECT h.*,CONCAT_WS(' ',u.first_name,u.last_name) changed_by_name FROM delivery_status_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.delivery_id=? ORDER BY h.changed_at DESC",
      [id],
    ),
    canServices?query<RowDataPacket[]>('SELECT ds.*,i.invoice_number,i.status invoice_status,i.amount_paid,i.balance_due FROM delivery_services ds JOIN invoices i ON i.id=ds.invoice_id WHERE ds.delivery_id=? ORDER BY ds.id',[id]):Promise.resolve([]),
  ]);
  const checklist=checklistCategories.flatMap((category:any)=>category.items.map((item:any)=>({...item,item_name:item.name_snapshot,category:category.code_snapshot,is_required:item.is_mandatory_snapshot,sort_order:item.sort_order_snapshot})));
  const mandatoryTotal=checklistCategories.reduce((sum:number,category:any)=>sum+Number(category.mandatory_total),0),mandatoryCompleted=checklistCategories.reduce((sum:number,category:any)=>sum+Number(category.mandatory_completed),0);
  return { ...row, checklist,checklist_categories:checklistCategories,checklist_progress:{mandatoryTotal,mandatoryCompleted,percent:mandatoryTotal?Math.round(mandatoryCompleted/mandatoryTotal*100):100}, documents, signatures, history,services };
}
async function notifyRoles(
  agencyId: string,
  permissions: string[],
  subject: string,
  message: string,
  referenceId: string,
) {
  await createPermissionNotifications({agencyId,permissions,subject,message,eventType:'delivery.status_changed',referenceType:'delivery',referenceId,priority:'normal'});
}
async function audit(connection:PoolConnection,request:Request,deliveryId:string,action:string,oldValues:unknown,newValues:unknown){
  await writeAudit(connection,request,{module:'deliveries',entityType:'delivery',entityId:deliveryId,action,oldValues,newValues});
}
deliveryRouter.get(
  "/deliveries",
  requirePermission('delivery.view'),
  asyncHandler(async (request, response) => {
    const scoped = scope(request,'delivery.view'),
      conditions = [scoped.sql],
      params = [...scoped.params];
    if (typeof request.query.status === "string" && request.query.status) {
      if (!STATUSES.includes(request.query.status))
        throw new HttpError(400, "Statut invalide");
      conditions.push("d.status=?");
      params.push(request.query.status);
    }
    if (typeof request.query.dateFrom === "string" && request.query.dateFrom) {
      conditions.push("d.scheduled_at>=?");
      params.push(request.query.dateFrom);
    }
    if (typeof request.query.dateTo === "string" && request.query.dateTo) {
      conditions.push("d.scheduled_at<DATE_ADD(?,INTERVAL 1 DAY)");
      params.push(request.query.dateTo);
    }
    if (
      typeof request.query.assignedUserId === "string" &&
      request.query.assignedUserId
    ) {
      conditions.push("d.delivery_specialist_id=?");
      params.push(idOf(request.query.assignedUserId));
    }
    if (
      typeof request.query.search === "string" &&
      request.query.search.trim()
    ) {
      const term = `%${request.query.search.trim()}%`;
      conditions.push(
        "(d.delivery_number LIKE ? OR s.sale_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ? OR v.vin LIKE ? OR v.registration_number LIKE ?)",
      );
      params.push(term, term, term, term, term, term, term);
    }
    const paginationRequested=request.query.page!=null||request.query.pageSize!=null;
    const [count]=paginationRequested?await query<RowDataPacket[]>(`SELECT COUNT(*) total FROM deliveries d JOIN sales s ON s.id=d.sale_id JOIN customers c ON c.id=d.customer_id JOIN vehicles v ON v.id=d.vehicle_id WHERE ${conditions.join(" AND ")}`,params):[undefined];
    const meta=paginationRequested?pageMeta(count?.total,pageRequest(request.query)):null;
    const rows = await query<RowDataPacket[]>(`${selection} WHERE ${conditions.join(" AND ")} ORDER BY d.scheduled_at IS NULL,d.scheduled_at,d.id${meta?' LIMIT ? OFFSET ?':''}`,meta?[...params,meta.pageSize,meta.offset]:params);
    const ids = rows.map((row) => row.id);
    let progress = new Map<string, { total: number; completed: number }>();
    if (ids.length) {
      const marks = ids.map(() => "?").join(",");
      const sums = await query<RowDataPacket[]>(
        `SELECT ci.delivery_id,SUM(ii.is_mandatory_snapshot=TRUE) total,SUM(ii.is_mandatory_snapshot=TRUE AND ii.is_completed=TRUE) completed FROM delivery_checklist_category_instances ci LEFT JOIN delivery_checklist_item_instances ii ON ii.category_instance_id=ci.id WHERE ci.delivery_id IN (${marks}) GROUP BY ci.delivery_id`,
        ids,
      );
      progress = new Map(
        sums.map((row) => [
          String(row.delivery_id),
          { total: Number(row.total), completed: Number(row.completed) },
        ]),
      );
    }
    const items=await Promise.all(rows.map(async(row) => {
      const[authorization]=await query<RowDataPacket[]>(`${authorizationSelect} WHERE fa.sale_id=? ORDER BY (fa.status='AUTHORIZED') DESC,fa.id DESC LIMIT 1`,[row.sale_id]);
      const balance=Number(row.balance_due),covered=authorization?.status==='AUTHORIZED'&&balance>0&&balance<=Number(authorization.balance_due_snapshot)+.001;
      return ({
        ...row,
        financially_cleared:balance<=.001||covered,
        financial_authorization:authorization??null,
        balance_due:await canViewFinancials(request,row.agency_id)?row.balance_due:null,
        checklist_progress: progress.get(String(row.id)) ?? {
          total: 0,
          completed: 0,
        },
      });}));
    response.json(meta?paged(items,count?.total,meta):items);
  }),
);

deliveryRouter.get(
  "/deliveries/stats",
  requirePermission('delivery.view'),
  asyncHandler(async (request, response) => {
    const scoped = scope(request,'delivery.view');
    const [totals, upcoming] = await Promise.all([
      query<RowDataPacket[]>(
        `SELECT COUNT(*) total,SUM(status='planned') planned,SUM(status IN ('preparing','quality_control')) preparing,SUM(status='ready') ready,SUM(status='delivered') delivered,SUM(status='cancelled') cancelled,SUM(status='delivered' AND DATE(delivered_at)=CURDATE()) delivered_today FROM deliveries d WHERE ${scoped.sql}`,
        [...scoped.params],
      ),
      query<RowDataPacket[]>(
        `SELECT COUNT(*) upcoming FROM deliveries d WHERE ${scoped.sql} AND status<>'cancelled' AND scheduled_at BETWEEN NOW() AND DATE_ADD(NOW(),INTERVAL 7 DAY)`,
        [...scoped.params],
      ),
    ]);
    response.json({ ...totals[0], ...upcoming[0] });
  }),
);
deliveryRouter.get('/deliveries/candidates',requirePermission('delivery.schedule'),asyncHandler(async(request,response)=>{
  const scoped=scope(request,'delivery.schedule','s');
  const rows=await query<RowDataPacket[]>(`SELECT s.id sale_id,s.sale_number,s.customer_id,s.salesperson_id,s.agency_id,s.status,s.total,i.balance_due,COALESCE(c.company_name,CONCAT_WS(' ',c.first_name,c.last_name)) customer_name,si.vehicle_id,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,CONCAT_WS(' ',u.first_name,u.last_name) salesperson_name FROM sales s JOIN customers c ON c.id=s.customer_id JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL JOIN vehicles v ON v.id=si.vehicle_id JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id LEFT JOIN users u ON u.id=s.salesperson_id JOIN invoices i ON i.id=(SELECT i2.id FROM invoices i2 WHERE i2.sale_id=s.id AND i2.status<>'cancelled' ORDER BY i2.id DESC LIMIT 1) WHERE ${scoped.sql} AND s.status='ready_for_delivery' AND i.status<>'draft' AND (i.balance_due<=0.001 OR EXISTS(SELECT 1 FROM delivery_financial_authorizations fa WHERE fa.sale_id=s.id AND fa.invoice_id=i.id AND fa.status='AUTHORIZED' AND i.balance_due<=fa.balance_due_snapshot+0.001)) AND NOT EXISTS(SELECT 1 FROM deliveries d WHERE d.sale_id=s.id AND d.status<>'cancelled') ORDER BY s.updated_at,s.id`,scoped.params);
  response.json(await Promise.all(rows.map(async row=>({...row,financially_cleared:Number(row.balance_due)<=.001,balance_due:await canViewFinancials(request,row.agency_id)?row.balance_due:null}))));
}));

deliveryRouter.get('/deliveries/candidates/:saleId/specialists',requirePermission('delivery.schedule'),asyncHandler(async(request,response)=>{
  const saleId=idOf(request.params.saleId),scoped=scope(request,'delivery.schedule','s');
  const[sale]=await query<RowDataPacket[]>(`SELECT s.agency_id FROM sales s WHERE s.id=? AND s.status='ready_for_delivery' AND ${scoped.sql}`,[saleId,...scoped.params]);
  if(!sale)throw new HttpError(404,'Vente prête introuvable dans votre périmètre');
  const rows=await query<RowDataPacket[]>(`SELECT DISTINCT u.id,CONCAT_WS(' ',u.first_name,u.last_name) display_name,u.agency_id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE u.agency_id=? AND u.is_active=TRUE AND r.is_active=TRUE AND p.code='delivery.prepare' AND p.is_active=TRUE AND ${operationalCandidateSql('u')} ORDER BY display_name,u.id`,[sale.agency_id]);
  response.json(rows.map(row=>({id:String(row.id),name:String(row.display_name),agencyId:String(row.agency_id)})));
}));

const authorizationSelect=`SELECT fa.*,(SELECT COALESCE(SUM(current.balance_due),0) FROM invoices current WHERE current.sale_id=fa.sale_id AND current.status NOT IN('draft','cancelled')) current_balance_due,i.status invoice_status,CONCAT_WS(' ',creator.first_name,creator.last_name) created_by_name,CONCAT_WS(' ',authorizer.first_name,authorizer.last_name) authorized_by_name,CONCAT_WS(' ',revoker.first_name,revoker.last_name) revoked_by_name FROM delivery_financial_authorizations fa JOIN invoices i ON i.id=fa.invoice_id LEFT JOIN users creator ON creator.id=fa.created_by LEFT JOIN users authorizer ON authorizer.id=fa.authorized_by LEFT JOIN users revoker ON revoker.id=fa.revoked_by`;
const authorizationDate=(value:any)=>value instanceof Date?value.toISOString().slice(0,10):value?String(value).slice(0,10):null;
const authorizationPayload=(row:any)=>({reason:String(row.reason),guaranteeType:row.guarantee_type??null,guaranteeDetails:row.guarantee_details??null,guaranteeReference:row.guarantee_reference??null,balanceDueDate:authorizationDate(row.balance_due_date),paymentTerms:row.payment_terms??null});
const normalizedAuthorizationPayload=(body:any)=>({reason:text(body.reason,'Motif',1000,true)!,guaranteeType:text(body.guaranteeType,'Type de garantie',100),guaranteeDetails:text(body.guaranteeDetails,'Détails de garantie',5000),guaranteeReference:text(body.guaranteeReference,'Référence de garantie',150),balanceDueDate:text(body.balanceDueDate,'Échéance',10),paymentTerms:text(body.paymentTerms,'Modalités de règlement',1000)});

deliveryRouter.get('/delivery/financial-authorizations/:saleId',requireAnyPermission(['delivery.view','delivery.financial_override.authorize']),asyncHandler(async(request,response)=>{
  const saleId=idOf(request.params.saleId),authorizationReadScope=permissionScope(request,'delivery.financial_override.authorize'),permission=authorizationReadScope&&authorizationReadScope!=='OWN'?'delivery.financial_override.authorize':'delivery.view',scoped=scope(request,permission,'s');
  const[sale]=await query<RowDataPacket[]>(`SELECT s.id FROM sales s WHERE s.id=? AND ${scoped.sql}`,[saleId,...scoped.params]);
  if(!sale)throw new HttpError(404,'Vente introuvable dans votre périmètre');
  const rows=await query<RowDataPacket[]>(`${authorizationSelect} WHERE fa.sale_id=? ORDER BY fa.id DESC`,[saleId]);
  response.json(rows.map(row=>({...row,valid_for_current_balance:row.status==='AUTHORIZED'&&Number(row.current_balance_due)>0&&Number(row.current_balance_due)<=Number(row.balance_due_snapshot)+.001})));
}));

deliveryRouter.post('/delivery/financial-authorizations',requirePermission('delivery.financial_override.authorize'),asyncHandler(async(request,response)=>{
  const saleId=idOf(String(request.body.saleId)),clientRequestId=String(request.body.clientRequestId??'').trim(),payload=normalizedAuthorizationPayload(request.body);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientRequestId))throw new HttpError(400,'clientRequestId UUID invalide');
  if(payload.balanceDueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(payload.balanceDueDate)||payload.balanceDueDate<new Date().toISOString().slice(0,10)))throw new HttpError(400,"L’échéance du solde ne peut pas être passée");
  const scoped=authorizationScope(request,'s');
  const outcome=await transaction(async connection=>{
    const[sales]=await connection.execute<RowDataPacket[]>(`SELECT s.id,s.agency_id,a.concession_id FROM sales s JOIN agencies a ON a.id=s.agency_id WHERE s.id=? AND ${scoped.sql} FOR UPDATE`,[saleId,...scoped.params] as any[]),sale=sales[0];
    if(!sale)throw new HttpError(404,'Vente introuvable dans votre périmètre');
    const[retryRows]=await connection.execute<RowDataPacket[]>('SELECT * FROM delivery_financial_authorizations WHERE created_by=? AND client_request_id=?',[request.user!.sub,clientRequestId]);
    if(retryRows[0]){if(JSON.stringify(authorizationPayload(retryRows[0]))!==JSON.stringify(payload)||String(retryRows[0].sale_id)!==saleId)throw new HttpError(409,'Ce clientRequestId a déjà été utilisé avec une autre intention');return{id:String(retryRows[0].id),created:false};}
    const[invoices]=await connection.execute<RowDataPacket[]>("SELECT id,status,total,amount_paid,balance_due,currency_code,invoice_type FROM invoices WHERE sale_id=? AND status<>'cancelled' ORDER BY id FOR UPDATE",[saleId]),invoice=invoices.find(row=>row.invoice_type==='vehicle'),billable=invoices.filter(row=>row.status!=='draft');
    if(!invoice||invoice.status==='draft')throw new HttpError(409,'Une facture véhicule émise est requise avant toute autorisation financière');
    if(new Set(billable.map(row=>String(row.currency_code))).size>1)throw new HttpError(409,'Les créances de livraison utilisent des devises incompatibles');
    const total=billable.reduce((sum,row)=>sum+Number(row.total),0),paid=billable.reduce((sum,row)=>sum+Number(row.amount_paid),0),balance=billable.reduce((sum,row)=>sum+Number(row.balance_due),0);
    if(balance<=.001)throw new HttpError(409,'La livraison est soldée : aucune dérogation financière n’est nécessaire');
    const[activeRows]=await connection.execute<RowDataPacket[]>("SELECT id,balance_due_snapshot FROM delivery_financial_authorizations WHERE sale_id=? AND status='AUTHORIZED' ORDER BY id DESC FOR UPDATE",[saleId]);
    if(activeRows[0]&&balance<=Number(activeRows[0].balance_due_snapshot)+.001)throw new HttpError(409,'Une autorisation financière active couvre déjà cette exposition');
    if(activeRows.length)await connection.execute("UPDATE delivery_financial_authorizations SET status='SUPERSEDED' WHERE sale_id=? AND status='AUTHORIZED'",[saleId]);
    const[result]=await connection.execute<ResultSetHeader>(`INSERT INTO delivery_financial_authorizations(sale_id,invoice_id,concession_id,agency_id,total_amount,paid_amount,balance_due_snapshot,currency_code,reason,guarantee_type,guarantee_details,guarantee_reference,balance_due_date,payment_terms,client_request_id,created_by,authorized_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[saleId,invoice.id,sale.concession_id,sale.agency_id,total,paid,balance,invoice.currency_code,payload.reason,payload.guaranteeType,payload.guaranteeDetails,payload.guaranteeReference,payload.balanceDueDate,payload.paymentTerms,clientRequestId,request.user!.sub,request.user!.sub]);
    await connection.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,new_values,ip_address,user_agent) VALUES(?,'deliveries','delivery_financial_authorization',?,'delivery.financial_authorization.authorized',?,?,?)`,[request.user!.sub,result.insertId,JSON.stringify({saleId,invoiceId:String(invoice.id),balanceDueSnapshot:balance,exposureInvoiceIds:billable.map(row=>String(row.id))}),request.ip??null,request.get('user-agent')??null]);
    return{id:String(result.insertId),created:true,agencyId:String(sale.agency_id)};
  });
  if(outcome.created)emitToAgency(outcome.agencyId!,'delivery:financial-authorization',{id:outcome.id,saleId});
  const[row]=await query<RowDataPacket[]>(`${authorizationSelect} WHERE fa.id=?`,[outcome.id]);
  response.status(outcome.created?201:200).json(row);
}));

deliveryRouter.post('/delivery/financial-authorizations/:authorizationId/revoke',requirePermission('delivery.financial_override.authorize'),asyncHandler(async(request,response)=>{
  const authorizationId=idOf(request.params.authorizationId),reason=text(request.body.reason,'Motif de révocation',1000,true)!,scoped=authorizationScope(request,'s');
  const result=await transaction(async connection=>{
    const[rows]=await connection.execute<RowDataPacket[]>(`SELECT fa.*,s.agency_id FROM delivery_financial_authorizations fa JOIN sales s ON s.id=fa.sale_id WHERE fa.id=? AND ${scoped.sql} FOR UPDATE`,[authorizationId,...scoped.params] as any[]),row=rows[0];
    if(!row)throw new HttpError(404,'Autorisation introuvable dans votre périmètre');
    if(row.status==='USED')throw new HttpError(409,'Une autorisation déjà utilisée ne peut pas être révoquée');
    if(row.status!=='AUTHORIZED')throw new HttpError(409,'Cette autorisation n’est plus révocable');
    await connection.execute("UPDATE delivery_financial_authorizations SET status='REVOKED',revoked_by=?,revoked_at=NOW(),revocation_reason=? WHERE id=?",[request.user!.sub,reason,authorizationId]);
    await connection.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,old_values,new_values,ip_address,user_agent) VALUES(?,'deliveries','delivery_financial_authorization',?,'delivery.financial_authorization.revoked',?,?,?,?)`,[request.user!.sub,authorizationId,JSON.stringify({status:'AUTHORIZED'}),JSON.stringify({status:'REVOKED',reason}),request.ip??null,request.get('user-agent')??null]);
    return{agencyId:String(row.agency_id),saleId:String(row.sale_id)};
  });
  emitToAgency(result.agencyId,'delivery:financial-authorization',{id:authorizationId,saleId:result.saleId,status:'REVOKED'});
  const[row]=await query<RowDataPacket[]>(`${authorizationSelect} WHERE fa.id=?`,[authorizationId]);response.json(row);
}));

deliveryRouter.get(
  "/deliveries/:id/checklist-applicable-categories",
  requirePermission('delivery.prepare'),
  asyncHandler(async(request,response)=>{
    const id=idOf(request.params.id),row=await accessible(id,request,'delivery.prepare');
    const categories=await query<RowDataPacket[]>(`SELECT c.id,c.code,c.name,c.description,c.sort_order,COUNT(i.id) item_count FROM agencies a JOIN delivery_checklist_categories c ON c.concession_id=a.concession_id AND c.is_active=TRUE LEFT JOIN delivery_checklist_items i ON i.category_id=c.id AND i.is_active=TRUE WHERE a.id=? GROUP BY c.id ORDER BY c.sort_order,c.id`,[row.agency_id]);
    response.json(categories);
  }),
);

deliveryRouter.get(
  "/deliveries/:id",
  requirePermission('delivery.view'),
  asyncHandler(async (request, response) =>
    response.json(await detail(idOf(request.params.id), request)),
  ),
);

deliveryRouter.use('/deliveries/:id',asyncHandler(async(request,_response,next)=>{
  if(!['POST','PATCH','PUT','DELETE'].includes(request.method)||request.path.endsWith('/cancel'))return next();
  const deliveryId=idOf(request.params.id),[sale]=await query<RowDataPacket[]>('SELECT s.status FROM deliveries d JOIN sales s ON s.id=d.sale_id WHERE d.id=?',[deliveryId]);
  if(sale?.status==='cancelled')throw new HttpError(409,'Une vente annulée est terminale et sa livraison ne peut plus être poursuivie');
  next();
}));

deliveryRouter.post(
  "/deliveries",
  requirePermission('delivery.schedule'),
  asyncHandler(async (request, response) => {
    if (!request.body.deliverySpecialistId)
      throw new HttpError(400, "Le Responsable livraison est obligatoire");
    const saleId = idOf(String(request.body.saleId)),
      scheduledAt = mysqlDateTime(request.body.scheduledAt, "Date de livraison"),
      location = text(request.body.deliveryLocation, "Lieu", 255),
      notes = text(request.body.customerNotes, "Notes", 5000),
      specialist = idOf(String(request.body.deliverySpecialistId));
    const concessionScope=permissionScope(request,'delivery.schedule')==='CONCESSION'?scope(request,'delivery.schedule','s'):null;
    const [sale] = await query<RowDataPacket[]>(
      `SELECT s.customer_id,s.agency_id,s.status,s.balance_due,si.vehicle_id FROM sales s JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL WHERE s.id=?${concessionScope?` AND ${concessionScope.sql}`:''}`,
      [saleId,...(concessionScope?.params??[])],
    );
    if (!sale) throw new HttpError(404, "Vente ou véhicule introuvable");
    const agencyId = concessionScope?String(sale.agency_id):agency(request,'delivery.schedule', sale.agency_id);
    if (String(sale.agency_id) !== agencyId)
      throw new HttpError(403, "Vente rattachée à une autre agence");
    if (sale.status !== "ready_for_delivery")
      throw new HttpError(409, "La vente doit être prête à livrer");
    const [u] = await query<RowDataPacket[]>(
      `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE u.id=? AND u.agency_id=? AND u.is_active=TRUE AND r.is_active=TRUE AND p.code='delivery.prepare' AND p.is_active=TRUE AND ${operationalCandidateSql('u')}`,
      [specialist, agencyId],
    );
    if (!u) throw new HttpError(400, "Responsable livraison invalide pour cette agence");
    const deliveryNumber = `LIV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
    const id = await transaction(async (connection) => {
      const[lockedSales]=await connection.execute<RowDataPacket[]>(`SELECT s.customer_id,s.agency_id,s.status,si.vehicle_id FROM sales s JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL WHERE s.id=? FOR UPDATE`,[saleId]),lockedSale=lockedSales[0];
      if(!lockedSale)throw new HttpError(404,'Vente ou véhicule introuvable');
      if(String(lockedSale.agency_id)!==agencyId)throw new HttpError(403,'Vente rattachée à une autre agence');
      if(lockedSale.status!=='ready_for_delivery')throw new HttpError(409,'La vente doit être prête à livrer');
      await lockActiveSaleInvoice(connection,saleId,'delivery');
      const[lockedUsers]=await connection.execute<RowDataPacket[]>(`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE u.id=? AND u.agency_id=? AND u.is_active=TRUE AND r.is_active=TRUE AND p.code='delivery.prepare' AND p.is_active=TRUE AND ${operationalCandidateSql('u')} FOR UPDATE`,[specialist,agencyId]);
      if(!lockedUsers[0])throw new HttpError(400,'Responsable livraison invalide pour cette agence');
      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM deliveries WHERE sale_id=? AND status<>'cancelled' FOR UPDATE`,
        [saleId],
      );
      if (existing[0])
        throw new HttpError(
          409,
          "Une livraison active existe déjà pour cette vente",
        );
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO deliveries(delivery_number,sale_id,customer_id,vehicle_id,agency_id,delivery_specialist_id,scheduled_at,delivery_location,status,customer_notes,created_by) VALUES(?,?,?,?,?,?,?,?, 'planned',?,?)`,
        [
          deliveryNumber,
          saleId,
          lockedSale.customer_id,
          lockedSale.vehicle_id,
          agencyId,
          specialist,
          scheduledAt,
          location,
          notes,
          request.user!.sub,
        ],
      );
      await connection.execute(
        `INSERT INTO delivery_status_history(delivery_id,new_status,reason,changed_by) VALUES(?,'planned','Planification',?)`,
        [result.insertId, request.user!.sub],
      );
      await audit(connection,request,String(result.insertId),'delivery.created',null,{saleId,specialist,scheduledAt});
      return String(result.insertId);
    });
    emitToAgency(agencyId, "deliveries:created", { id, deliveryNumber });
    await notifyRoles(
      agencyId,
      ['delivery.prepare'],
      "Livraison à préparer",
      `${deliveryNumber} est planifiée le ${scheduledAt}`,
      id,
    );
    response.status(201).json(await detail(id, request,'delivery.schedule'));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/status",
  requirePermission('delivery.prepare'),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      row = await accessible(id, request,'delivery.prepare'),
      status = text(request.body.status, "Statut", 30, true)!;
    if (!STATUSES.includes(status)) throw new HttpError(400, "Statut invalide");
    if(row.status===status&&status==='preparing')return response.json(await detail(id,request,'delivery.prepare'));
    if (!ALLOWED[row.status]?.includes(status))
      throw new HttpError(
        409,
        `Transition ${row.status} → ${status} interdite`,
      );
    if (status === "delivered" || status === "cancelled")
      throw new HttpError(
        409,
        status === "delivered" ? "Utilisez la signature client pour livrer le véhicule" : "Utilisez l’action d’annulation dédiée",
      );
    const reason = text(
      request.body.reason,
      "Motif",
      500,
      status === "cancelled",
    );
    const changed=await transaction(async (connection) => {
      const[currentRows]=await connection.execute<RowDataPacket[]>('SELECT status,sale_id FROM deliveries WHERE id=? FOR UPDATE',[id]),current=currentRows[0];
      if(!current)throw new HttpError(404,'Livraison introuvable');
      if(current.status==='preparing'&&status==='preparing')return false;
      if(String(current.status)!==String(row.status))throw new HttpError(409,'Le statut de la livraison a changé, rechargez le dossier');
      const isForwardProgression=current.status==='planned'&&status==='preparing'||current.status==='preparing'&&status==='quality_control'||current.status==='quality_control'&&status==='ready';
      if(isForwardProgression){
        const[sales]=await connection.execute<RowDataPacket[]>('SELECT id FROM sales WHERE id=? FOR UPDATE',[current.sale_id]);
        if(!sales[0])throw new HttpError(409,'La vente associée est introuvable');
        await lockActiveSaleInvoice(connection,String(current.sale_id),'delivery');
      }
      if(current.status==='planned'&&status==='preparing'){
        const created=await createDeliveryChecklistSnapshot(connection,id,request.user!.sub,Array.isArray(request.body.categoryIds)?request.body.categoryIds:undefined);
        if(created)await audit(connection,request,id,'delivery.checklist_snapshot_created',null,{categoryIds:request.body.categoryIds??'ALL_ACTIVE'});
      }
      if(status==='ready')await lockAndAssertDeliveryChecklistComplete(connection,id);
      await connection.execute(
        `UPDATE deliveries SET status=?,prepared_at=IF(?='ready',NOW(),prepared_at),postponement_reason=IF(?='planned',?,postponement_reason),cancellation_reason=IF(?='cancelled',?,cancellation_reason),quality_notes=COALESCE(?,quality_notes) WHERE id=?`,
        [
          status,
          status,
          status,
          reason,
          status,
          reason,
          text(request.body.qualityNotes, "Notes qualité", 5000),
          id,
        ],
      );
      await connection.execute(
        "INSERT INTO delivery_status_history(delivery_id,old_status,new_status,reason,changed_by) VALUES(?,?,?,?,?)",
        [id, row.status, status, reason, request.user!.sub],
      );
      await audit(connection,request,id,'delivery.status_changed',{status:row.status},{status,reason});
      return true;
    });
    if(changed)emitToAgency(String(row.agency_id), "deliveries:status", { id, status });
    response.json(await detail(id, request,'delivery.prepare'));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/cancel",
  requirePermission('delivery.cancel'),
  asyncHandler(async (request,response)=>{
    const id=idOf(request.params.id),row=await accessible(id,request,'delivery.cancel'),reason=text(request.body.reason,'Motif',500,true)!;
    if(row.status==='delivered')throw new HttpError(409,'Une livraison physiquement terminée ne peut pas être annulée');
    if(row.status==='cancelled')return response.json(await detail(id,request,'delivery.cancel'));
    await transaction(async connection=>{
      const[rows]=await connection.execute<RowDataPacket[]>('SELECT status FROM deliveries WHERE id=? FOR UPDATE',[id]),current=rows[0];
      if(!current)throw new HttpError(404,'Livraison introuvable');
      if(current.status==='delivered')throw new HttpError(409,'Une livraison physiquement terminée ne peut pas être annulée');
      if(current.status==='cancelled')return;
      await connection.execute("UPDATE deliveries SET status='cancelled',cancellation_reason=? WHERE id=?",[reason,id]);
      await connection.execute("INSERT INTO delivery_status_history(delivery_id,old_status,new_status,reason,changed_by) VALUES(?,?,'cancelled',?,?)",[id,current.status,reason,request.user!.sub]);
      await audit(connection,request,id,'delivery.cancelled',{status:current.status},{status:'cancelled',reason});
    });
    emitToAgency(String(row.agency_id),'deliveries:status',{id,status:'cancelled'});
    response.json(await detail(id,request,'delivery.cancel'));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/reschedule",
  requirePermission('delivery.schedule'),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      row = await accessible(id, request,'delivery.schedule'),
      scheduled = mysqlDateTime(request.body.scheduledAt, "Nouvelle date"),
      reason = text(request.body.reason, "Motif du report", 500, true)!;
    if (["delivered","cancelled"].includes(row.status))
      throw new HttpError(
        409,
        "Une livraison finalisée ou annulée ne peut pas être reportée",
      );
    await transaction(async (connection) => {
      await connection.execute(
        `UPDATE deliveries SET scheduled_at=?,status='planned',postponement_reason=? WHERE id=?`,
        [scheduled, reason, id],
      );
      await connection.execute(
        `INSERT INTO delivery_status_history(delivery_id,old_status,new_status,reason,changed_by) VALUES(?,?,'planned',?,?)`,
        [id, row.status, reason, request.user!.sub],
      );
    });
    emitToAgency(String(row.agency_id), "deliveries:rescheduled", {
      id,
      scheduledAt: scheduled,
    });
    await notifyRoles(
      String(row.agency_id),
      ['delivery.view'],
      "Livraison reportée",
      `${row.delivery_number}: ${reason}`,
      id,
    );
    response.json(await detail(id, request,'delivery.schedule'));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/checklist/:itemId",
  requirePermission('delivery.checklist.manage'),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      itemId = idOf(request.params.itemId),
      row = await accessible(id, request,'delivery.checklist.manage');
    if (["delivered", "cancelled"].includes(row.status))
      throw new HttpError(409, "Cette livraison ne peut plus être modifiée");
    if (!["preparing", "quality_control", "ready"].includes(row.status))
      throw new HttpError(409, "Démarrez la préparation avant la checklist");
    const completed = Boolean(request.body.completed),notes=text(request.body.notes,"Notes",5000);
    const updated=await transaction(async connection=>{
      const scoped=scope(request,'delivery.checklist.manage');
      const[deliveries]=await connection.execute<RowDataPacket[]>(`SELECT d.id,d.status,d.agency_id FROM deliveries d WHERE d.id=? AND ${scoped.sql} FOR UPDATE`,[id,...scoped.params] as any[]),lockedDelivery=deliveries[0];
      if(!lockedDelivery)throw new HttpError(404,'Livraison introuvable');
      if(["delivered", "cancelled"].includes(String(lockedDelivery.status)))throw new HttpError(409,"Cette livraison ne peut plus être modifiée");
      if(!["preparing", "quality_control", "ready"].includes(String(lockedDelivery.status)))throw new HttpError(409,"Démarrez la préparation avant la checklist");
      const[items]=await connection.execute<RowDataPacket[]>(`SELECT ii.id,ii.is_completed,ii.notes,ci.code_snapshot category FROM delivery_checklist_item_instances ii JOIN delivery_checklist_category_instances ci ON ci.id=ii.category_instance_id WHERE ii.id=? AND ci.delivery_id=? FOR UPDATE`,[itemId,id]),item=items[0];
      if(!item)throw new HttpError(404,'Élément de checklist introuvable');
      if(Boolean(item.is_completed)===completed&&String(item.notes??'')===String(notes??''))return{agencyId:String(lockedDelivery.agency_id),changed:false};
      await connection.execute("UPDATE delivery_checklist_item_instances SET is_completed=?,completed_by=?,completed_at=IF(?,NOW(),NULL),notes=? WHERE id=?",[completed,completed?request.user!.sub:null,completed,notes,itemId]);
      await audit(connection,request,id,'delivery.checklist_updated',{itemId,completed:Boolean(item.is_completed)},{itemId,completed,category:item.category});
      return{agencyId:String(lockedDelivery.agency_id),changed:true};
    });
    if(updated.changed)emitToAgency(updated.agencyId, "deliveries:checklist", {
      deliveryId: id,
      itemId,
      completed,
    });
    response.json(await detail(id, request,'delivery.checklist.manage'));
  }),
);

deliveryRouter.post(
  "/deliveries/:id/documents",
  requirePermission('delivery.checklist.manage'),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      row = await accessible(id, request,'delivery.checklist.manage'),
      name = text(request.body.documentName, "Nom du document", 200, true)!,
      type = text(request.body.documentType, "Type", 100),
      fileName = text(request.body.fileName, "Nom du fichier", 255),
      mime = text(request.body.mimeType, "Type MIME", 100),
      base64 = text(request.body.dataBase64, "Fichier", 20_000_000),
      required = Boolean(request.body.isRequired),received=Boolean(request.body.received);
    if (["delivered", "cancelled"].includes(row.status))
      throw new HttpError(409, "Les documents d’une livraison finalisée ne peuvent plus être modifiés");
    let url: string | null = null,
      size: number | null = null;
    if (base64) {
      const uploaded=decodeDeliveryDocument(base64,fileName,mime),buffer=uploaded.buffer;
      const stored=await storeDocument(uploaded,String(row.agency_id));
      url=`ged:${stored.storageKey}`;
      size = buffer.length;
      let result:ResultSetHeader;
      try {
        result = await execute(
          `INSERT INTO delivery_documents(delivery_id,document_name,document_type,document_url,file_name,mime_type,file_size,is_required,received,received_by,received_at) VALUES(?,?,?,?,?,?,?,?,?,?,IF(?,NOW(),NULL))`,
          [id,name,type,url,fileName,mime,size,required,received,received?request.user!.sub:null,received],
        );
      } catch(error) {
        await unlink(stored.absolute).catch(()=>undefined);
        throw error;
      }
      emitToAgency(String(row.agency_id), "deliveries:document", {deliveryId:id,documentId:String(result.insertId)});
      return response.status(201).json(await detail(id, request,'delivery.checklist.manage'));
    }
    const result = await execute(
      `INSERT INTO delivery_documents(delivery_id,document_name,document_type,document_url,file_name,mime_type,file_size,is_required,received,received_by,received_at) VALUES(?,?,?,?,?,?,?,?,?,?,IF(?,NOW(),NULL))`,
      [id,name,type,url,fileName,mime,size,required,received,received?request.user!.sub:null,received],
    );
    emitToAgency(String(row.agency_id), "deliveries:document", {
      deliveryId: id,
      documentId: String(result.insertId),
    });
    response.status(201).json(await detail(id, request,'delivery.checklist.manage'));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/documents/:documentId",
  requirePermission('delivery.checklist.manage'),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      documentId = idOf(request.params.documentId),
      row = await accessible(id, request,'delivery.checklist.manage'),
      received = Boolean(request.body.received);
    if (["delivered", "cancelled"].includes(row.status))throw new HttpError(409,"Les documents d’une livraison finalisée ne peuvent plus être modifiés");
    await transaction(async connection=>{
      const[docs]=await connection.execute<RowDataPacket[]>('SELECT received FROM delivery_documents WHERE id=? AND delivery_id=? FOR UPDATE',[documentId,id]);
      if(!docs[0])throw new HttpError(404,'Document introuvable');
      await connection.execute("UPDATE delivery_documents SET received=?,received_by=?,received_at=IF(?,NOW(),NULL) WHERE id=?",[received,received?request.user!.sub:null,received,documentId]);
      await audit(connection,request,id,'delivery.document_received',{documentId,received:Boolean(docs[0].received)},{documentId,received});
    });
    response.json(await detail(id, request,'delivery.checklist.manage'));
  }),
);

deliveryRouter.get(
  '/deliveries/:id/documents/:documentId/download',
  requireAnyPermission(DELIVERY_DOCUMENT_PERMISSIONS),
  asyncHandler(async(request,response)=>{
    const id=idOf(request.params.id),documentId=idOf(request.params.documentId);
    const[document]=await query<RowDataPacket[]>('SELECT id,delivery_id,document_name,document_url,file_name,mime_type FROM delivery_documents WHERE id=? AND delivery_id=? LIMIT 1',[documentId,id]);
    if(!document?.document_url)throw new HttpError(404,'Document de livraison introuvable');
    if(!await canAccessNested(id,request,DELIVERY_DOCUMENT_PERMISSIONS))throw new HttpError(404,'Document de livraison introuvable');
    const file=await requireDocumentFile(String(document.document_url));
    const fileName=String(document.file_name??document.document_name??`document-livraison-${document.id}`).replace(/[\r\n]/g,' ').slice(0,180);
    response.setHeader('Content-Type',String(document.mime_type??'application/octet-stream'));
    response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Cache-Control','private, no-store');
    response.sendFile(path.resolve(file));
  }),
);

deliveryRouter.post(
  "/deliveries/:id/sign",
  requirePermission('delivery.signature.capture'),
  requirePermission('delivery.complete'),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      scopedRow = await accessible(id, request,'delivery.complete'),
      signer = text(request.body.signerName, "Signataire", 200, true)!,
      signature = text(
        request.body.signatureData,
        "Signature",
        2_000_000,
        true,
      )!,
      consent = text(request.body.consentText, "Consentement", 500, true)!;
    const requestedStampId=request.body.serviceStampId==null||request.body.serviceStampId===''?null:idOf(request.body.serviceStampId);
    if (
      !signature.startsWith("data:image/png;base64,") ||
      signature.length < 200
    )
      throw new HttpError(400, "Une signature manuscrite PNG est requise");
    const requestedMileage=request.body.mileageAtDelivery;
    const signedAt=new Date(),signedAtSql=signedAt.toISOString().slice(0,19).replace('T',' ');
    let archiveAbsolute:string|null=null;let result:{duplicate:boolean;agencyId:string;deliveryNumber:string;documentId?:string};try{result=await transaction(async connection=>{
      const[deliveries]=await connection.execute<RowDataPacket[]>('SELECT d.*,s.status sale_status FROM deliveries d JOIN sales s ON s.id=d.sale_id WHERE d.id=? FOR UPDATE',[id]),delivery=deliveries[0];
      if(!delivery)throw new HttpError(404,'Livraison introuvable');
      if(String(delivery.agency_id)!==String(scopedRow.agency_id))throw new HttpError(403,'Livraison rattachée à une autre agence');
      if(delivery.status==='delivered')return{duplicate:true,agencyId:String(delivery.agency_id),deliveryNumber:String(delivery.delivery_number)};
      if(delivery.status!=='ready')throw new HttpError(409,'La livraison doit être prête avant signature');
      if(delivery.sale_status!=='ready_for_delivery')throw new HttpError(409,`Le statut de la vente (${delivery.sale_status}) est incompatible avec la remise`);
      let userSignatureVersionId:string|null=null,serviceStampVersionId:string|null=null;
      if(request.rbac?.permissions.has('document.signature.apply')){const[signature]=await connection.execute<RowDataPacket[]>('SELECT sv.id FROM user_signature_versions sv JOIN users u ON u.id=sv.user_id AND u.is_active=TRUE WHERE sv.user_id=? AND sv.is_active=TRUE FOR UPDATE',[request.user!.sub]);userSignatureVersionId=signature[0]?String(signature[0].id):null}
      if(requestedStampId){const stampScope=request.rbac?.permissions.get('stamp.use');if(!request.rbac?.permissions.has('stamp.use')||stampScope==='OWN')throw new HttpError(403,'Utilisation du cachet non autorisée');const[stamp]=await connection.execute<RowDataPacket[]>(`SELECT sv.id FROM service_stamps st JOIN service_stamp_versions sv ON sv.stamp_id=st.id AND sv.is_active=TRUE JOIN agencies da ON da.id=? LEFT JOIN users actor ON actor.id=? WHERE st.id=? AND st.is_active=TRUE AND st.document_context='DELIVERY_REPORT' AND st.concession_id=da.concession_id AND (st.agency_id IS NULL OR st.agency_id=da.id) AND (st.department_id IS NULL OR st.department_id=actor.department_id) AND (?='GLOBAL' OR ?='CONCESSION' OR (?='AGENCY' AND st.agency_id=da.id)) FOR UPDATE`,[delivery.agency_id,request.user!.sub,requestedStampId,stampScope,stampScope,stampScope]);if(!stamp[0])throw new HttpError(409,'Cachet inactif ou incompatible avec cette livraison');serviceStampVersionId=String(stamp[0].id)}
      if(process.env.NODE_ENV==='test')await deliverySignTestHooks.afterMarksLocked?.();
      const financialEligibility=await useDeliveryFinancialAuthorization(connection,String(delivery.sale_id),id,request.user!.sub);
      await lockAndAssertDeliveryChecklistComplete(connection,id);
      const[pendingDocs]=await connection.execute<RowDataPacket[]>('SELECT COUNT(*) count FROM delivery_documents WHERE delivery_id=? AND is_required=TRUE AND received=FALSE',[id]);
      if(Number(pendingDocs[0]?.count??0)>0)throw new HttpError(409,'Les documents obligatoires ne sont pas tous remis.');
      const[vehicles]=await connection.execute<RowDataPacket[]>('SELECT id,status,mileage FROM vehicles WHERE id=? FOR UPDATE',[delivery.vehicle_id]),vehicle=vehicles[0];
      if(!vehicle)throw new HttpError(409,'Le véhicule associé est introuvable');
      if(vehicle.status!=='sold')throw new HttpError(409,`Le statut actuel du véhicule (${vehicle.status}) est incompatible avec la livraison`);
      const mileage=assertHandoverMileage(vehicle.mileage,requestedMileage);
      await activateAtDelivery(connection,{saleId:String(delivery.sale_id),vehicleId:String(delivery.vehicle_id),mileage,signedAt:signedAtSql,userId:request.user!.sub});
      const hash=deliverySignatureHash({deliveryId:id,saleId:String(delivery.sale_id),vehicleId:String(delivery.vehicle_id),signer,mileage,signedAt:signedAt.toISOString(),signature});
      await connection.execute('INSERT INTO delivery_signatures(delivery_id,signer_name,signed_by,user_signature_version_id,service_stamp_version_id,signature_data,consent_text,document_hash,signed_at,ip_address) VALUES(?,?,?,?,?,?,?,?,?,?)',[id,signer,request.user!.sub,userSignatureVersionId,serviceStampVersionId,signature,consent,hash,signedAtSql,request.ip??null]);
      await connection.execute("UPDATE deliveries SET status='delivered',delivered_at=?,mileage_at_delivery=? WHERE id=?",[signedAtSql,mileage,id]);
      await connection.execute("UPDATE sales SET status='delivered',sold_at=COALESCE(sold_at,?) WHERE id=?",[signedAtSql,delivery.sale_id]);
      await connection.execute("UPDATE vehicles SET status='delivered',mileage=? WHERE id=?",[mileage,delivery.vehicle_id]);
      await connection.execute("INSERT INTO vehicle_status_history(vehicle_id,old_status,new_status,changed_by,reason) VALUES(?,?,'delivered',?,'Livraison client signée')",[delivery.vehicle_id,vehicle.status,request.user!.sub]);
      await connection.execute("INSERT INTO delivery_status_history(delivery_id,old_status,new_status,reason,changed_by) VALUES(?,'ready','delivered','Signature client',?)",[id,request.user!.sub]);
      await audit(connection,request,id,'delivery.finalized',{status:'ready',vehicleStatus:vehicle.status,vehicleMileage:Number(vehicle.mileage)},{status:'delivered',vehicleStatus:'delivered',mileage,signer,signedAt:signedAt.toISOString(),hash,userSignatureVersionId,serviceStampVersionId});
      if(userSignatureVersionId)await writeAudit(connection,request,{module:'documents',entityType:'delivery',entityId:id,action:'document.signature.applied',newValues:{userSignatureVersionId,documentContext:'DELIVERY_REPORT'}});
      if(serviceStampVersionId)await writeAudit(connection,request,{module:'documents',entityType:'delivery',entityId:id,action:'document.stamp.applied',newValues:{serviceStampVersionId,documentContext:'DELIVERY_REPORT'}});
      if(financialEligibility.coveredByAuthorization&&financialEligibility.authorization)await connection.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,new_values,ip_address,user_agent) VALUES(?,'deliveries','delivery_financial_authorization',?,'delivery.financial_authorization.used',?,?,?)`,[request.user!.sub,financialEligibility.authorization.id,JSON.stringify({deliveryId:id,currentBalanceDue:Number(financialEligibility.invoice.balance_due)}),request.ip??null,request.get('user-agent')??null]);
      const archived=await archiveDeliveryInTransaction(connection,id,request.user!.sub);archiveAbsolute=archived.absolute;
      return{duplicate:false,agencyId:String(delivery.agency_id),deliveryNumber:String(delivery.delivery_number),documentId:archived.documentId};
    })}catch(error){if(archiveAbsolute)await unlink(archiveAbsolute).catch(()=>undefined);throw error}
    if(result.duplicate){await requireBusinessArchive(`delivery:${id}:finalized`,()=>archiveDelivery(id,request.user!.sub));return response.json(await detail(id,request,'delivery.complete'));}
    emitToAgency(result.agencyId, "deliveries:delivered", { id });
    if(result.documentId){emitToAgency(result.agencyId,'documents:created',{id:result.documentId,entityType:'delivery',entityId:id,origin:'generated'});if(process.env.NODE_ENV==='test')deliverySignTestHooks.afterDocumentRealtime?.(result.documentId)}
    await notifyRoles(
      result.agencyId,
      ['delivery.view'],
      "Véhicule livré",
      `${result.deliveryNumber} a été signé par ${signer}`,
      id,
    );
    response.json(await detail(id, request,'delivery.complete'));
  }),
);

deliveryRouter.get(
  "/deliveries/:id/pdf",
  requirePermission('delivery.view'),
  requirePermission('delivery.documents.view'),
  asyncHandler(async (request, response) => {
    const row = await detail(idOf(request.params.id), request,'delivery.documents.view');
    const buffer = row.status==='delivered'?await requiredHistoricalBusinessPdf(`delivery:${row.id}:finalized:`):await renderDeliveryDocument(String(row.id));
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `${request.query.download === "true" ? "attachment" : "inline"}; filename="pv-${row.delivery_number}.pdf"`,
    );
    response.send(buffer);
  }),
);

deliveryRouter.get(
  "/deliveries-planning/pdf",
  requirePermission('delivery.view'),
  asyncHandler(async (request, response) => {
    const scoped = scope(request,'delivery.view'),
      date =
        typeof request.query.date === "string"
          ? request.query.date
          : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new HttpError(400, "Date invalide");
    const rows = await query<RowDataPacket[]>(
      `${selection} WHERE ${scoped.sql} AND DATE(d.scheduled_at)=? ORDER BY d.scheduled_at`,
      [...scoped.params, date],
    );
    const identityAgency=rows[0]?.agency_id??request.user?.agencyId;
    const identity=identityAgency?await documentIdentityForAgency(String(identityAgency)):await defaultDocumentIdentity();
    const buffer = await renderDeliveryPlanningDocumentData(rows,date,identity);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `inline; filename="planning-livraisons-${date}.pdf"`,
    );
    response.send(buffer);
  }),
);
