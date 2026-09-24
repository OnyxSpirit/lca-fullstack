import { unlink } from "node:fs/promises";
import path from "node:path";
import { Router, type Request } from "express";
import PDFDocument from "pdfkit";
import {archiveDelivery,safelyArchive} from "../documents/business-document.service.js";
import {renderDeliveryDocument} from "../documents/commercial-document.js";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, transaction } from "../../config/database.js";
import { requireAnyPermission, requirePermission } from "../../middleware/require-permission.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { emitToAgency } from "../../realtime/socket.js";
import { HttpError } from "../../shared/http-error.js";
import { notifyPermissions as createPermissionNotifications } from "../notifications/notification.service.js";
import { assertFinanciallySettled } from "../billing/payment.domain.js";
import {assertHandoverMileage,deliverySignatureHash} from './delivery.domain.js';
import {operationalCandidateSql} from '../users/operational-candidate.js';
import {requireDocumentFile,storeDocument} from '../documents/document-storage.js';
import {decodeDeliveryDocument} from './delivery-document.js';

export const deliveryRouter = Router();
type DeliveryPermission='delivery.view'|'delivery.prepare'|'delivery.schedule'|'delivery.checklist.view'|'delivery.checklist.manage'|'delivery.documents.view'|'delivery.signature.capture'|'delivery.complete'|'delivery.cancel';
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
const PHASE_FOR_STATUS:Record<string,string|null>={planned:null,preparing:'preparation',quality_control:'quality',ready:'handover'};
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
const permissionScope=(request:Request,permission:DeliveryPermission)=>request.rbac?.isSuperAdmin?'GLOBAL':request.rbac?.permissions.get(permission);
async function canViewFinancials(request:Request,agencyId:unknown){
  if(request.rbac?.isSuperAdmin)return true;
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
const selection = `SELECT d.*,s.sale_number,s.status sale_status,s.total sale_total,COALESCE((SELECT i.balance_due FROM invoices i WHERE i.sale_id=s.id AND i.status<>'cancelled' ORDER BY i.id DESC LIMIT 1),s.balance_due) balance_due,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,c.phone,c.email,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,v.vin,v.registration_number,v.mileage vehicle_mileage,CONCAT_WS(' ',sp.first_name,sp.last_name) salesperson_name,CONCAT_WS(' ',du.first_name,du.last_name) delivery_specialist_name,a.name agency_name FROM deliveries d JOIN sales s ON s.id=d.sale_id JOIN customers c ON c.id=d.customer_id JOIN vehicles v ON v.id=d.vehicle_id JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id LEFT JOIN users sp ON sp.id=s.salesperson_id LEFT JOIN users du ON du.id=d.delivery_specialist_id JOIN agencies a ON a.id=d.agency_id`;

async function accessible(id: string, request: Request, permission:DeliveryPermission): Promise<any> {
  const scoped = scope(request,permission);
  const [row] = await query<RowDataPacket[]>(
    `${selection} WHERE d.id=? AND ${scoped.sql}`,
    [id, ...scoped.params],
  );
  if (!row) throw new HttpError(404, "Livraison introuvable");
  return {...row,financially_cleared:Number(row.balance_due)<=.001,balance_due:await canViewFinancials(request,row.agency_id)?row.balance_due:null};
}
async function canAccessNested(id:string,request:Request,permissions:DeliveryPermission[]){
  if(request.rbac?.isSuperAdmin)return true;
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
  const [checklist, documents, signatures, history] = await Promise.all([
    canChecklist?query<RowDataPacket[]>(
      "SELECT dc.*,CONCAT_WS(' ',u.first_name,u.last_name) completed_by_name FROM delivery_checklists dc LEFT JOIN users u ON u.id=dc.completed_by WHERE dc.delivery_id=? ORDER BY FIELD(dc.category,'preparation','quality','handover','documents'),dc.sort_order,dc.id",
      [id],
    ):Promise.resolve([]),
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
  ]);
  return { ...row, checklist, documents, signatures, history };
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
  await connection.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,old_values,new_values,ip_address,user_agent) VALUES(?,'deliveries','delivery',?,?,?,?,?,?)`,[request.user!.sub,deliveryId,action,oldValues==null?null:JSON.stringify(oldValues),newValues==null?null:JSON.stringify(newValues),request.ip??null,request.get('user-agent')??null]);
}
function pdfBuffer(render: (doc: PDFKit.PDFDocument) => void) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 45 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    render(doc);
    doc.end();
  });
}
function header(doc: PDFKit.PDFDocument, title: string) {
  doc.fontSize(20).fillColor("#8f1722").text("LA CONGOLAISE DE L’AUTOMOBILE");
  doc.moveDown(0.3).fontSize(15).fillColor("#111113").text(title);
  doc.moveDown();
}
function line(doc: PDFKit.PDFDocument, label: string, value: unknown) {
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(`${label} : `, { continued: true })
    .font("Helvetica")
    .text(String(value ?? "—"));
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
    const rows = await query<RowDataPacket[]>(
      `${selection} WHERE ${conditions.join(" AND ")} ORDER BY d.scheduled_at IS NULL,d.scheduled_at,d.id`,
      params,
    );
    const ids = rows.map((row) => row.id);
    let progress = new Map<string, { total: number; completed: number }>();
    if (ids.length) {
      const marks = ids.map(() => "?").join(",");
      const sums = await query<RowDataPacket[]>(
        `SELECT delivery_id,COUNT(*) total,SUM(is_completed) completed FROM delivery_checklists WHERE delivery_id IN (${marks}) GROUP BY delivery_id`,
        ids,
      );
      progress = new Map(
        sums.map((row) => [
          String(row.delivery_id),
          { total: Number(row.total), completed: Number(row.completed) },
        ]),
      );
    }
    response.json(
      await Promise.all(rows.map(async(row) => ({
        ...row,
        financially_cleared:Number(row.balance_due)<=.001,
        balance_due:await canViewFinancials(request,row.agency_id)?row.balance_due:null,
        checklist_progress: progress.get(String(row.id)) ?? {
          total: 0,
          completed: 0,
        },
      }))),
    );
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
  const rows=await query<RowDataPacket[]>(`SELECT s.id sale_id,s.sale_number,s.customer_id,s.salesperson_id,s.agency_id,s.status,s.total,COALESCE((SELECT i.balance_due FROM invoices i WHERE i.sale_id=s.id AND i.status<>'cancelled' ORDER BY i.id DESC LIMIT 1),s.balance_due) balance_due,COALESCE(c.company_name,CONCAT_WS(' ',c.first_name,c.last_name)) customer_name,si.vehicle_id,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,CONCAT_WS(' ',u.first_name,u.last_name) salesperson_name FROM sales s JOIN customers c ON c.id=s.customer_id JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL JOIN vehicles v ON v.id=si.vehicle_id JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id LEFT JOIN users u ON u.id=s.salesperson_id WHERE ${scoped.sql} AND s.status='ready_for_delivery' AND NOT EXISTS(SELECT 1 FROM deliveries d WHERE d.sale_id=s.id AND d.status<>'cancelled') ORDER BY s.updated_at,s.id`,scoped.params);
  response.json(await Promise.all(rows.map(async row=>({...row,financially_cleared:Number(row.balance_due)<=.001,balance_due:await canViewFinancials(request,row.agency_id)?row.balance_due:null}))));
}));

deliveryRouter.get('/deliveries/candidates/:saleId/specialists',requirePermission('delivery.schedule'),asyncHandler(async(request,response)=>{
  const saleId=idOf(request.params.saleId),scoped=scope(request,'delivery.schedule','s');
  const[sale]=await query<RowDataPacket[]>(`SELECT s.agency_id FROM sales s WHERE s.id=? AND s.status='ready_for_delivery' AND ${scoped.sql}`,[saleId,...scoped.params]);
  if(!sale)throw new HttpError(404,'Vente prête introuvable dans votre périmètre');
  const rows=await query<RowDataPacket[]>(`SELECT DISTINCT u.id,CONCAT_WS(' ',u.first_name,u.last_name) display_name,u.agency_id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE u.agency_id=? AND u.is_active=TRUE AND r.is_active=TRUE AND p.code='delivery.prepare' AND p.is_active=TRUE AND ${operationalCandidateSql('u')} ORDER BY display_name,u.id`,[sale.agency_id]);
  response.json(rows.map(row=>({id:String(row.id),name:String(row.display_name),agencyId:String(row.agency_id)})));
}));

const CHECKLIST_CATEGORIES=['preparation','quality','documents','handover'];
deliveryRouter.get('/deliveries/checklist-templates',requirePermission('delivery.checklist.view'),asyncHandler(async(request,response)=>{const agencyId=agency(request,'delivery.checklist.view',request.query.agencyId);const rows=await query<RowDataPacket[]>('SELECT id,agency_id,item_name,category,is_required,sort_order,is_active,created_at FROM delivery_checklist_templates WHERE agency_id IS NULL OR agency_id=? ORDER BY category,sort_order,id',[agencyId]);response.json(rows)}));
deliveryRouter.post('/deliveries/checklist-templates',requirePermission('delivery.checklist.manage'),asyncHandler(async(request,response)=>{const agencyId=request.body.agencyId?agency(request,'delivery.checklist.manage',request.body.agencyId):null,name=text(request.body.itemName,'Nom',200,true)!,category=text(request.body.category,'Catégorie',30,true)!;if(!CHECKLIST_CATEGORIES.includes(category))throw new HttpError(400,'Catégorie de checklist invalide');const sortOrder=Number(request.body.sortOrder??0);if(!Number.isInteger(sortOrder)||sortOrder<0)throw new HttpError(400,'Ordre invalide');const result=await execute('INSERT INTO delivery_checklist_templates(agency_id,item_name,category,is_required,sort_order,is_active) VALUES(?,?,?,?,?,?)',[agencyId,name,category,Boolean(request.body.isRequired),sortOrder,request.body.isActive!==false]);response.status(201).json({id:String(result.insertId)});}));
deliveryRouter.patch('/deliveries/checklist-templates/:templateId',requirePermission('delivery.checklist.manage'),asyncHandler(async(request,response)=>{const templateId=idOf(request.params.templateId),name=text(request.body.itemName,'Nom',200,true)!,category=text(request.body.category,'Catégorie',30,true)!;if(!CHECKLIST_CATEGORIES.includes(category))throw new HttpError(400,'Catégorie de checklist invalide');const sortOrder=Number(request.body.sortOrder??0);if(!Number.isInteger(sortOrder)||sortOrder<0)throw new HttpError(400,'Ordre invalide');const result=await execute('UPDATE delivery_checklist_templates SET item_name=?,category=?,is_required=?,sort_order=?,is_active=? WHERE id=?',[name,category,Boolean(request.body.isRequired),sortOrder,request.body.isActive!==false,templateId]);if(!result.affectedRows)throw new HttpError(404,'Template de checklist introuvable');response.json({success:true});}));

deliveryRouter.get(
  "/deliveries/:id",
  requirePermission('delivery.view'),
  asyncHandler(async (request, response) =>
    response.json(await detail(idOf(request.params.id), request)),
  ),
);

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
      const [templates] = await connection.execute<RowDataPacket[]>(
        `SELECT id,item_name,category,is_required,sort_order FROM delivery_checklist_templates WHERE is_active=TRUE AND (agency_id IS NULL OR agency_id=?) ORDER BY agency_id IS NULL DESC,sort_order,id`,
        [agencyId],
      );
      for (const item of templates){
        if(item.category==='documents')await connection.execute("INSERT INTO delivery_documents(delivery_id,document_name,document_type,is_required,received) VALUES(?,?,? ,?,FALSE)",[result.insertId,item.item_name,'physical_handover',item.is_required]);
        else await connection.execute("INSERT INTO delivery_checklists(delivery_id,template_id,item_name,category,is_required,sort_order) VALUES(?,?,?,?,?,?)",[result.insertId,item.id,item.item_name,item.category,item.is_required,item.sort_order]);
      }
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
    await transaction(async (connection) => {
      const[currentRows]=await connection.execute<RowDataPacket[]>('SELECT status FROM deliveries WHERE id=? FOR UPDATE',[id]),current=currentRows[0];
      if(!current)throw new HttpError(404,'Livraison introuvable');
      if(String(current.status)!==String(row.status))throw new HttpError(409,'Le statut de la livraison a changé, rechargez le dossier');
      const requiredPhase=status==='quality_control'?'preparation':status==='ready'?'quality':null;
      if(requiredPhase){
        const[pendingRows]=await connection.execute<RowDataPacket[]>('SELECT COUNT(*) count FROM delivery_checklists WHERE delivery_id=? AND category=? AND is_required=TRUE AND is_completed=FALSE',[id,requiredPhase]);
        if(Number(pendingRows[0]?.count??0)>0)throw new HttpError(409,requiredPhase==='preparation'?'Checklist de préparation incomplète.':'Checklist de contrôle qualité incomplète.');
      }
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
    });
    emitToAgency(String(row.agency_id), "deliveries:status", { id, status });
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
    const completed = Boolean(request.body.completed);
    await transaction(async connection=>{
      const[items]=await connection.execute<RowDataPacket[]>('SELECT id,category,is_completed FROM delivery_checklists WHERE id=? AND delivery_id=? FOR UPDATE',[itemId,id]),item=items[0];
      if(!item)throw new HttpError(404,'Élément de checklist introuvable');
      const phase=PHASE_FOR_STATUS[String(row.status)];
      if(item.category!==phase)throw new HttpError(409,`Cet élément appartient à la phase ${item.category}`);
      await connection.execute("UPDATE delivery_checklists SET is_completed=?,completed_by=?,completed_at=IF(?,NOW(),NULL),notes=? WHERE id=?",[completed,completed?request.user!.sub:null,completed,text(request.body.notes,"Notes",5000),itemId]);
      await audit(connection,request,id,'delivery.checklist_updated',{itemId,completed:Boolean(item.is_completed)},{itemId,completed,category:item.category});
    });
    emitToAgency(String(row.agency_id), "deliveries:checklist", {
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
    if (
      !signature.startsWith("data:image/png;base64,") ||
      signature.length < 200
    )
      throw new HttpError(400, "Une signature manuscrite PNG est requise");
    const requestedMileage=request.body.mileageAtDelivery;
    const signedAt=new Date(),signedAtSql=signedAt.toISOString().slice(0,19).replace('T',' ');
    const result=await transaction(async connection=>{
      const[deliveries]=await connection.execute<RowDataPacket[]>('SELECT d.*,s.status sale_status FROM deliveries d JOIN sales s ON s.id=d.sale_id WHERE d.id=? FOR UPDATE',[id]),delivery=deliveries[0];
      if(!delivery)throw new HttpError(404,'Livraison introuvable');
      if(String(delivery.agency_id)!==String(scopedRow.agency_id))throw new HttpError(403,'Livraison rattachée à une autre agence');
      if(delivery.status==='delivered')return{duplicate:true,agencyId:String(delivery.agency_id),deliveryNumber:String(delivery.delivery_number)};
      if(delivery.status!=='ready')throw new HttpError(409,'La livraison doit être prête avant signature');
      if(delivery.sale_status!=='ready_for_delivery')throw new HttpError(409,`Le statut de la vente (${delivery.sale_status}) est incompatible avec la remise`);
      const[invoices]=await connection.execute<RowDataPacket[]>("SELECT id,balance_due,status FROM invoices WHERE sale_id=? AND status<>'cancelled' ORDER BY id DESC LIMIT 1 FOR UPDATE",[delivery.sale_id]);
      if(!invoices[0])throw new HttpError(409,'La facture de vente est absente');
      assertFinanciallySettled(invoices[0].balance_due,'livraison');
      const[pendingChecklist]=await connection.execute<RowDataPacket[]>("SELECT COUNT(*) count FROM delivery_checklists WHERE delivery_id=? AND category IN('preparation','quality','handover') AND is_required=TRUE AND is_completed=FALSE",[id]);
      if(Number(pendingChecklist[0]?.count??0)>0)throw new HttpError(409,'Checklist de remise client incomplète.');
      const[pendingDocs]=await connection.execute<RowDataPacket[]>('SELECT COUNT(*) count FROM delivery_documents WHERE delivery_id=? AND is_required=TRUE AND received=FALSE',[id]);
      if(Number(pendingDocs[0]?.count??0)>0)throw new HttpError(409,'Les documents obligatoires ne sont pas tous remis.');
      const[vehicles]=await connection.execute<RowDataPacket[]>('SELECT id,status,mileage FROM vehicles WHERE id=? FOR UPDATE',[delivery.vehicle_id]),vehicle=vehicles[0];
      if(!vehicle)throw new HttpError(409,'Le véhicule associé est introuvable');
      if(vehicle.status!=='sold')throw new HttpError(409,`Le statut actuel du véhicule (${vehicle.status}) est incompatible avec la livraison`);
      const mileage=assertHandoverMileage(vehicle.mileage,requestedMileage);
      const hash=deliverySignatureHash({deliveryId:id,saleId:String(delivery.sale_id),vehicleId:String(delivery.vehicle_id),signer,mileage,signedAt:signedAt.toISOString(),signature});
      await connection.execute('INSERT INTO delivery_signatures(delivery_id,signer_name,signed_by,signature_data,consent_text,document_hash,signed_at,ip_address) VALUES(?,?,?,?,?,?,?,?)',[id,signer,request.user!.sub,signature,consent,hash,signedAtSql,request.ip??null]);
      await connection.execute("UPDATE deliveries SET status='delivered',delivered_at=?,mileage_at_delivery=? WHERE id=?",[signedAtSql,mileage,id]);
      await connection.execute("UPDATE sales SET status='delivered',sold_at=COALESCE(sold_at,?) WHERE id=?",[signedAtSql,delivery.sale_id]);
      await connection.execute("UPDATE vehicles SET status='delivered',mileage=? WHERE id=?",[mileage,delivery.vehicle_id]);
      await connection.execute("INSERT INTO vehicle_status_history(vehicle_id,old_status,new_status,changed_by,reason) VALUES(?,?,'delivered',?,'Livraison client signée')",[delivery.vehicle_id,vehicle.status,request.user!.sub]);
      await connection.execute("INSERT INTO delivery_status_history(delivery_id,old_status,new_status,reason,changed_by) VALUES(?,'ready','delivered','Signature client',?)",[id,request.user!.sub]);
      await audit(connection,request,id,'delivery.finalized',{status:'ready',vehicleStatus:vehicle.status,vehicleMileage:Number(vehicle.mileage)},{status:'delivered',vehicleStatus:'delivered',mileage,signer,signedAt:signedAt.toISOString(),hash});
      return{duplicate:false,agencyId:String(delivery.agency_id),deliveryNumber:String(delivery.delivery_number)};
    });
    if(result.duplicate){await safelyArchive(`delivery:${id}:finalized`,()=>archiveDelivery(id,request.user!.sub));return response.json(await detail(id,request,'delivery.complete'));}
    emitToAgency(result.agencyId, "deliveries:delivered", { id });
    await notifyRoles(
      result.agencyId,
      ['delivery.view'],
      "Véhicule livré",
      `${result.deliveryNumber} a été signé par ${signer}`,
      id,
    );
    await safelyArchive(`delivery:${id}:finalized`,()=>archiveDelivery(id,request.user!.sub));
    response.json(await detail(id, request,'delivery.complete'));
  }),
);

deliveryRouter.get(
  "/deliveries/:id/pdf",
  requirePermission('delivery.view'),
  requirePermission('delivery.documents.view'),
  asyncHandler(async (request, response) => {
    const row = await detail(idOf(request.params.id), request,'delivery.documents.view');
    const buffer = await renderDeliveryDocument(String(row.id));
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
    const buffer = await pdfBuffer((doc) => {
      header(doc, `PLANNING DES LIVRAISONS — ${date}`);
      for (const row of rows) {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(
            `${String(row.scheduled_at).slice(11, 16)} · ${row.delivery_number} · ${row.customer_name}`,
          );
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(
            `${row.vehicle_label} — ${row.delivery_location ?? "Concession"} — ${row.status}`,
          );
        doc.moveDown(0.5);
      }
      if (!rows.length) doc.fontSize(10).text("Aucune livraison planifiée.");
    });
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `inline; filename="planning-livraisons-${date}.pdf"`,
    );
    response.send(buffer);
  }),
);
