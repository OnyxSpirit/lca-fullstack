import { Router, type Request } from "express";
import PDFDocument from "pdfkit";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, transaction } from "../../config/database.js";
import { authorize, unrestricted } from "../../middleware/authorize.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { emitToAgency, emitToUser } from "../../realtime/socket.js";
import { notifyRoles as createRoleNotifications } from "../notifications/notification.service.js";
import { HttpError } from "../../shared/http-error.js";
import { lockPartStock,lockPartStockById } from "../parts/part-stock.js";
import { getBusinessIdentity,getEffectiveBusinessSettings } from "../settings/setting-resolver.js";
export const workshopRouter = Router();
const READ = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "SERVICE_MANAGER",
  "SERVICE_ADVISOR",
  "WORKSHOP_MANAGER",
  "TECHNICIAN",
  "RECEPTIONIST",
  "PARTS_MANAGER",
  "WAREHOUSE_CLERK",
  "SALES_MANAGER",
  "SALES_AGENT",
];
const CREATE = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "SERVICE_MANAGER",
  "SERVICE_ADVISOR",
  "WORKSHOP_MANAGER",
  "RECEPTIONIST",
];
const OPERATE = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "SERVICE_MANAGER",
  "SERVICE_ADVISOR",
  "WORKSHOP_MANAGER",
  "TECHNICIAN",
];
const DOSSIER=["SUPER_ADMIN","DIRECTOR","SERVICE_MANAGER","SERVICE_ADVISOR","WORKSHOP_MANAGER"];
const MANAGE = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "SERVICE_MANAGER",
  "WORKSHOP_MANAGER",
];
const ITEMS = [...OPERATE, "PARTS_MANAGER", "WAREHOUSE_CLERK"];
const RESOURCE_MANAGE = ["SUPER_ADMIN", "DIRECTOR", "SERVICE_MANAGER", "WORKSHOP_MANAGER"];
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
];
const normalTransitions:Record<string,string[]>={planned:['received'],received:['diagnosis'],diagnosis:['waiting_approval'],waiting_approval:['in_progress'],in_progress:['quality_control'],quality_control:['ready','in_progress'],delivered:['closed']};
const idOf = (v: any) => {
  v = String(v ?? "");
  if (!/^[1-9]\d*$/.test(v)) throw new HttpError(400, "Identifiant invalide");
  return v;
};
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
const ensureWritable=(ro:any,allowed?:string[])=>{if(['quality_control','ready','invoiced','delivered','closed','cancelled'].includes(ro.status))throw new HttpError(409,`OR ${ro.status}: modification interdite`);if(allowed&&!allowed.includes(ro.status))throw new HttpError(409,`Action interdite au statut ${ro.status}`);};
const agencyFromQuery=(r:Request)=>unrestricted(r)?idOf(r.query.agencyId):r.user!.agencyId!;
workshopRouter.get('/workshop/config',authorize(...READ),asyncHandler(async(r,res)=>{const config=await getEffectiveBusinessSettings(agencyFromQuery(r));res.json({vatRate:config.vatRate,rates:config.rates,currencyCode:config.currencyCode})}));
const scope = (r: Request, a = "ro") =>
  unrestricted(r)
    ? { sql: "1=1", p: [] }
    : { sql: `${a}.agency_id=?`, p: [r.user!.agencyId] };
const select = `SELECT ro.*,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,c.phone customer_phone,v.vin,v.registration_number,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,CONCAT_WS(' ',u.first_name,u.last_name) advisor_name FROM repair_orders ro JOIN customers c ON c.id=ro.customer_id JOIN vehicles v ON v.id=ro.vehicle_id JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id LEFT JOIN users u ON u.id=ro.advisor_id`;
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
    invoices,
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
    query<RowDataPacket[]>("SELECT pr.*,p.reference part_reference,p.name part_name,l.name location_name FROM part_reservations pr JOIN parts p ON p.id=pr.part_id LEFT JOIN locations l ON l.id=pr.location_id WHERE pr.repair_order_id=? ORDER BY pr.created_at DESC",[id]),
    query<RowDataPacket[]>("SELECT qc.*,CONCAT_WS(' ',u.first_name,u.last_name) controlled_by_name FROM repair_quality_controls qc LEFT JOIN users u ON u.id=qc.controlled_by WHERE qc.repair_order_id=? ORDER BY qc.controlled_at DESC",[id]),
    query<RowDataPacket[]>("SELECT h.*,CONCAT_WS(' ',u.first_name,u.last_name) handed_over_by_name FROM repair_order_handovers h LEFT JOIN users u ON u.id=h.handed_over_by WHERE h.repair_order_id=?",[id]),
    query<RowDataPacket[]>("SELECT id,invoice_number,status,subtotal,tax_total,total,issue_date FROM invoices WHERE repair_order_id=? AND status<>'cancelled' ORDER BY id DESC",[id]),
  ]);
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
    invoice: invoices[0]??null,
  };
}
async function notify(
  agency: string,
  subject: string,
  message: string,
  id: string,
) {
  await createRoleNotifications({agencyId:agency,roles:['SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER'],includeGlobalRoles:['DIRECTOR','SUPER_ADMIN'],subject,message,eventType:'workshop.status_changed',referenceType:'repair_order',referenceId:id,priority:'normal'});
}
workshopRouter.get(
  "/repair-orders",
  authorize(...READ),
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
  authorize(...READ),
  asyncHandler(async (r, res) => {
    const s = scope(r);
    const [x] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) total,SUM(status NOT IN('closed','cancelled')) open,SUM(status='in_progress') in_progress,SUM(warranty_covered) warranty,COALESCE(SUM(actual_total),0) revenue FROM repair_orders ro WHERE ${s.sql}`,
      s.p,
    );
    const [b] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) total,SUM(status='occupied') occupied FROM workshop_bays WHERE ${unrestricted(r) ? "1=1" : "agency_id=?"}`,
      unrestricted(r) ? [] : [r.user!.agencyId],
    );
    res.json({
      ...x,
      baysTotal: b?.total ?? 0,
      baysOccupied: b?.occupied ?? 0,
    });
  }),
);
workshopRouter.get(
  "/repair-orders/:id",
  authorize(...READ),
  asyncHandler(async (r, res) => res.json(await detail(idOf(r.params.id), r))),
);
workshopRouter.post(
  "/repair-orders",
  authorize(...CREATE),
  asyncHandler(async (r, res) => {
    const customer = idOf(r.body.customerId),
      vehicle = idOf(r.body.vehicleId),
      agency =
        unrestricted(r) && r.body.agencyId
          ? String(r.body.agencyId)
          : r.user!.agencyId!;
    const mileage=Number(r.body.mileage??0);if(!Number.isInteger(mileage)||mileage<0)throw new HttpError(400,"Kilométrage invalide");
    if(Boolean(r.body.warrantyCovered)&&!txt(r.body.warrantyReference,"Référence garantie",100))throw new HttpError(400,"Référence garantie requise");
    const promised=r.body.promisedCompletionAt?dateTime(r.body.promisedCompletionAt,"Fin promise"):null;
    const [valid] = await query<RowDataPacket[]>(
      "SELECT c.id FROM customers c JOIN vehicles v ON v.agency_id=c.agency_id WHERE c.id=? AND v.id=? AND c.agency_id=?",
      [customer, vehicle, agency],
    );
    if (!valid)
      throw new HttpError(
        400,
        "Client et véhicule doivent appartenir à la même agence",
      );
    const appointment=r.body.appointmentId?idOf(r.body.appointmentId):null;
    const no = `OR-${Date.now()}`;
    const repairOrderId=await transaction(async c=>{
      if(appointment){const [appointments]=await c.execute<RowDataPacket[]>("SELECT id FROM service_appointments WHERE id=? AND customer_id=? AND vehicle_id=? AND agency_id=? FOR UPDATE",[appointment,customer,vehicle,agency]);if(!appointments[0])throw new HttpError(400,"Rendez-vous SAV incompatible");}
      const [x] = await c.execute<ResultSetHeader>(
        `INSERT INTO repair_orders(order_number,appointment_id,customer_id,vehicle_id,agency_id,advisor_id,mileage_in,complaint,diagnosis_summary,status,warranty_covered,warranty_reference,promised_completion_at,created_by)VALUES(?,?,?,?,?,?,?,?,?,'planned',?,?,?,?)`,
        [
          no,
          appointment,
          customer,
          vehicle,
          agency,
          r.body.advisorId ?? r.user!.sub,
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
  authorize(...DOSSIER),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),
      ro = await one(id, r),
      next = txt(r.body.status, "Statut", 40, true)!;
    const reason=txt(r.body.reason,"Motif",500,next==='cancelled');
    if(['invoiced','delivered'].includes(next))throw new HttpError(409,next==='invoiced'?"Utilisez la génération de facture":"Utilisez la remise du véhicule");
    const valid=(next==='cancelled'&&!['invoiced','delivered','closed','cancelled'].includes(ro.status))||(normalTransitions[ro.status]??[]).includes(next);
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
    if(next==='waiting_approval'){const [diagnostic]=await query<RowDataPacket[]>("SELECT id FROM diagnostics WHERE repair_order_id=?",[id]);if(!diagnostic)throw new HttpError(409,"Diagnostic obligatoire");}
    if(next==='quality_control'){const [openIntervention]=await query<RowDataPacket[]>("SELECT id FROM interventions WHERE repair_order_id=? AND status NOT IN('completed','cancelled') LIMIT 1",[id]);if(openIntervention)throw new HttpError(409,"Toutes les interventions doivent être terminées");const [running]=await query<RowDataPacket[]>("SELECT id FROM work_sessions WHERE repair_order_id=? AND status='running' LIMIT 1",[id]);if(running)throw new HttpError(409,"Une session de travail est encore active");}
    if(next==='ready'){const [qc]=await query<RowDataPacket[]>("SELECT result,planned_work_completed,defect_corrected,no_leaks,levels_checked,cleanliness_checked FROM repair_quality_controls WHERE repair_order_id=? ORDER BY controlled_at DESC LIMIT 1",[id]);if(!qc||qc.result!=='passed'||![qc.planned_work_completed,qc.defect_corrected,qc.no_leaks,qc.levels_checked,qc.cleanliness_checked].every(Boolean))throw new HttpError(409,"Contrôle qualité validé obligatoire");}
    await transaction(async (c) => {
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
  authorize(...CREATE),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),ro=await one(id, r);ensureWritable(ro,['planned','received']);
    await execute(
      `INSERT INTO vehicle_reception_inspections(repair_order_id,fuel_level,cleanliness,bodywork_damage,items_in_vehicle,mileage,observations,customer_signature,inspected_by)VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE fuel_level=VALUES(fuel_level),cleanliness=VALUES(cleanliness),bodywork_damage=VALUES(bodywork_damage),items_in_vehicle=VALUES(items_in_vehicle),mileage=VALUES(mileage),observations=VALUES(observations),customer_signature=VALUES(customer_signature),inspected_by=VALUES(inspected_by),inspected_at=NOW()`,
      [
        id,
        r.body.fuelLevel,
        r.body.cleanliness,
        r.body.bodyworkDamage,
        r.body.itemsInVehicle,
        r.body.mileage==null?null:Math.max(0,Number(r.body.mileage)),
        txt(r.body.observations,"Observations",5000),
        r.body.customerSignature,
        r.user!.sub,
      ],
    );
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'inspection'});res.json(await detail(id, r));
  }),
);
workshopRouter.post(
  "/repair-orders/:id/diagnostics",
  authorize(...OPERATE),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),ro=await one(id, r);ensureWritable(ro,['received','diagnosis']);
    const technician=r.body.technicianId?idOf(r.body.technicianId):null,hours=Number(r.body.estimatedHours??0);if(hours<0||!Number.isFinite(hours))throw new HttpError(400,"Temps estimé invalide");
    if(technician){const [valid]=await query<RowDataPacket[]>("SELECT id FROM technicians WHERE id=? AND agency_id=? AND is_active=1",[technician,ro.agency_id]);if(!valid)throw new HttpError(400,"Technicien invalide pour cette agence");}
    await execute(
      "INSERT INTO diagnostics(repair_order_id,technician_id,diagnosis,recommendations,estimated_hours)VALUES(?,?,?,?,?)",
      [
        id,
        technician,
        txt(r.body.diagnosis, "Diagnostic", 10000, true),
        txt(r.body.recommendations, "Recommandations", 10000),
        hours,
      ],
    );
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'diagnostic'});res.status(201).json(await detail(id, r));
  }),
);
workshopRouter.post(
  "/repair-orders/:id/approval",
  authorize(...DOSSIER),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),ro=await one(id, r);ensureWritable(ro,['waiting_approval']);
    const approvedAmount=r.body.approvedAmount==null?null:Number(r.body.approvedAmount);if(approvedAmount!=null&&(!Number.isFinite(approvedAmount)||approvedAmount<0))throw new HttpError(400,"Montant accepté invalide");
    await execute(
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
    );
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'approval'});res.status(201).json(await detail(id, r));
  }),
);
workshopRouter.get(
  "/service-appointments",
  authorize(...READ),
  asyncHandler(async (r, res) => {
    const s = unrestricted(r) ? { sql: "1=1", p: [] } : { sql: "sa.agency_id=?", p: [r.user!.agencyId] };
    res.json(await query<RowDataPacket[]>(`SELECT sa.*,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,v.vin,v.registration_number FROM service_appointments sa JOIN customers c ON c.id=sa.customer_id JOIN vehicles v ON v.id=sa.vehicle_id WHERE ${s.sql} ORDER BY sa.scheduled_at`, s.p));
  }),
);
workshopRouter.post(
  "/service-appointments",
  authorize(...CREATE),
  asyncHandler(async (r, res) => {
    const customer=idOf(r.body.customerId), vehicle=idOf(r.body.vehicleId);
    const agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;
    const [valid]=await query<RowDataPacket[]>("SELECT c.id FROM customers c JOIN vehicles v ON v.agency_id=c.agency_id WHERE c.id=? AND v.id=? AND c.agency_id=?",[customer,vehicle,agency]);
    if(!valid) throw new HttpError(400,"Client et véhicule doivent appartenir à la même agence");
    const no=`RDV-SAV-${Date.now()}`;
    const x=await execute(`INSERT INTO service_appointments(appointment_number,customer_id,vehicle_id,agency_id,advisor_id,scheduled_at,reason,symptoms,status)VALUES(?,?,?,?,?,?,?,?,'scheduled')`,[no,customer,vehicle,agency,r.body.advisorId??r.user!.sub,r.body.scheduledAt,txt(r.body.reason,"Motif",255,true),txt(r.body.symptoms,"Symptômes",5000)]);
    emitToAgency(String(agency),"workshop:appointment-created",{id:String(x.insertId),appointmentNumber:no});
    res.status(201).json({id:String(x.insertId),appointmentNumber:no});
  }),
);
workshopRouter.patch(
  "/service-appointments/:id/status",
  authorize(...CREATE),
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
  authorize(...ITEMS),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),
      ro = await one(id, r),
      type = txt(r.body.itemType, "Type", 20, true)!,
      qty = Number(r.body.quantity);
    ensureWritable(ro);
    const businessConfig=await getEffectiveBusinessSettings(String(ro.agency_id));
    const rateCode=r.body.rateCode==null?null:String(r.body.rateCode).toUpperCase();
    if(rateCode&&!['T1','T2','T3','T4'].includes(rateCode))throw new HttpError(400,'Code tarif atelier invalide');
    const price=type==='labor'&&rateCode?businessConfig.rates[rateCode as keyof typeof businessConfig.rates]:Number(r.body.unitPrice);
    if (
      !["part", "labor", "accessory", "other"].includes(type) ||
      qty <= 0 ||
      price < 0
    )
      throw new HttpError(400, "Ligne OR invalide");
    let changedStock:any=null;
    await transaction(async (c) => {
      if(r.body.interventionId){const [linked]=await c.execute<RowDataPacket[]>("SELECT id FROM interventions WHERE id=? AND repair_order_id=?",[idOf(r.body.interventionId),id]);if(!linked[0])throw new HttpError(400,"Intervention étrangère à cet OR");}
      let partStockId:any=null;
      if (type === "part") {
        const part = idOf(r.body.partId), location=r.body.locationId?idOf(r.body.locationId):null;
        const stock=r.body.partStockId?await lockPartStockById(c,idOf(r.body.partStockId),part,String(ro.agency_id)):await lockPartStock(c,part,String(ro.agency_id),location);
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
        "INSERT INTO repair_order_items(repair_order_id,part_id,part_stock_id,intervention_id,item_type,description,quantity,unit_price,discount,tax_rate,line_total)VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        [
          id,
          r.body.partId ?? null,
          partStockId,
          r.body.interventionId??null,
          type,
          txt(r.body.description, "Description", 255, true),
          qty,
          price,
          r.body.discount ?? 0,
          businessConfig.vatRate,
          total,
        ],
      );
      await c.execute(
        "UPDATE repair_orders SET estimated_total=(SELECT COALESCE(SUM(line_total*(1+tax_rate/100)),0) FROM repair_order_items WHERE repair_order_id=? AND status='active') WHERE id=?",
        [id, id],
      );
    });
    emitToAgency(String(ro.agency_id), "parts:stock-changed", {repairOrderId:id,agencyId:String(ro.agency_id),partId:changedStock?.partId??null,locationId:changedStock?.locationId??null});
    res.status(201).json(await detail(id, r));
  }),
);
workshopRouter.patch('/repair-orders/:id/items/:itemId',authorize(...ITEMS),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),itemId=idOf(r.params.itemId),ro=await one(id,r);ensureWritable(ro);const quantity=Number(r.body.quantity),price=r.body.unitPrice==null?null:Number(r.body.unitPrice);if(!Number.isFinite(quantity)||quantity<=0||price!=null&&(!Number.isFinite(price)||price<0))throw new HttpError(400,'Quantité ou tarif invalide');const changed=await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_order_items WHERE id=? AND repair_order_id=? AND status=\'active\' FOR UPDATE',[itemId,id]);const item=rows[0];if(!item)throw new HttpError(404,'Ligne OR active introuvable');const delta=quantity-Number(item.quantity);if(item.item_type==='part'&&delta!==0){if(!item.part_stock_id)throw new HttpError(409,'Ligne historique sans stock local; correction manuelle requise');const [stocks]=await c.execute<RowDataPacket[]>('SELECT * FROM part_stocks WHERE id=? AND part_id=? AND agency_id=? FOR UPDATE',[item.part_stock_id,item.part_id,ro.agency_id]);const stock=stocks[0];if(!stock)throw new HttpError(409,'Stock local introuvable');if(delta>0&&Number(stock.current_stock)-Number(stock.reserved_stock)<delta)throw new HttpError(409,'Stock disponible insuffisant');await c.execute('UPDATE part_stocks SET current_stock=current_stock-? WHERE id=?',[delta,stock.id]);await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'adjustment',?,'repair_order',?,'Correction ligne OR',?)",[item.part_id,ro.agency_id,stock.location_id,-delta,id,r.user!.sub]);}const unitPrice=price??Number(item.unit_price),discount=Number(item.discount);await c.execute('UPDATE repair_order_items SET quantity=?,unit_price=?,line_total=? WHERE id=?',[quantity,unitPrice,quantity*unitPrice-discount,itemId]);await c.execute("UPDATE repair_orders SET estimated_total=(SELECT COALESCE(SUM(line_total*(1+tax_rate/100)),0) FROM repair_order_items WHERE repair_order_id=? AND status='active') WHERE id=?",[id,id]);return{partId:item.part_id?String(item.part_id):null,partStockId:item.part_stock_id?String(item.part_stock_id):null};});emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'items'});if(changed.partId)emitToAgency(String(ro.agency_id),'parts:stock-changed',{repairOrderId:id,agencyId:String(ro.agency_id),...changed});res.json(await detail(id,r));}));
workshopRouter.delete('/repair-orders/:id/items/:itemId',authorize(...ITEMS),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),itemId=idOf(r.params.itemId),ro=await one(id,r);ensureWritable(ro);const changed=await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>('SELECT * FROM repair_order_items WHERE id=? AND repair_order_id=? AND status=\'active\' FOR UPDATE',[itemId,id]);const item=rows[0];if(!item)throw new HttpError(404,'Ligne OR active introuvable');if(item.item_type==='part'){if(!item.part_stock_id)throw new HttpError(409,'Ligne historique sans stock local; annulation manuelle requise');const [stocks]=await c.execute<RowDataPacket[]>('SELECT * FROM part_stocks WHERE id=? AND part_id=? AND agency_id=? FOR UPDATE',[item.part_stock_id,item.part_id,ro.agency_id]);const stock=stocks[0];if(!stock)throw new HttpError(409,'Stock local introuvable');await c.execute('UPDATE part_stocks SET current_stock=current_stock+? WHERE id=?',[item.quantity,stock.id]);await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'adjustment',?,'repair_order',?,'Annulation ligne OR',?)",[item.part_id,ro.agency_id,stock.location_id,item.quantity,id,r.user!.sub]);}await c.execute("UPDATE repair_order_items SET status='cancelled',cancelled_by=?,cancelled_at=NOW() WHERE id=?",[r.user!.sub,itemId]);await c.execute("UPDATE repair_orders SET estimated_total=(SELECT COALESCE(SUM(line_total*(1+tax_rate/100)),0) FROM repair_order_items WHERE repair_order_id=? AND status='active') WHERE id=?",[id,id]);return{partId:item.part_id?String(item.part_id):null,partStockId:item.part_stock_id?String(item.part_stock_id):null};});emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'items'});if(changed.partId)emitToAgency(String(ro.agency_id),'parts:stock-changed',{repairOrderId:id,agencyId:String(ro.agency_id),...changed});res.json(await detail(id,r));}));
workshopRouter.post(
  "/repair-orders/:id/interventions",
  authorize(...OPERATE),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),ro=await one(id,r);ensureWritable(ro);
    const hours=Number(r.body.plannedHours??0),rateCode=r.body.rateCode==null?null:String(r.body.rateCode).toUpperCase(),config=await getEffectiveBusinessSettings(String(ro.agency_id));
    if(rateCode&&!['T1','T2','T3','T4'].includes(rateCode))throw new HttpError(400,'Code tarif atelier invalide');
    const price=rateCode?config.rates[rateCode as keyof typeof config.rates]:Number(r.body.unitPrice??0);
    if(hours<=0||price<0) throw new HttpError(400,"Durée ou tarif invalide");const technician=r.body.technicianId?idOf(r.body.technicianId):null;if(technician){const [valid]=await query<RowDataPacket[]>("SELECT id FROM technicians WHERE id=? AND agency_id=? AND is_active=1",[technician,ro.agency_id]);if(!valid)throw new HttpError(400,"Technicien invalide pour cette agence");}
    await execute("INSERT INTO interventions(repair_order_id,technician_id,description,intervention_type,planned_hours,unit_price,line_total,status)VALUES(?,?,?,?,?,?,?,'planned')",[id,technician,txt(r.body.description,"Intervention",5000,true),txt(r.body.interventionType,"Type",100),hours,price,hours*price]);
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'interventions'});
    res.status(201).json(await detail(id,r));
  }),
);
workshopRouter.patch(
  "/repair-orders/:id/interventions/:interventionId/status",
  authorize(...OPERATE),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),intervention=idOf(r.params.interventionId),status=txt(r.body.status,"Statut",30,true)!;
    if(!["planned","assigned","in_progress","completed","cancelled"].includes(status)) throw new HttpError(400,"Statut d'intervention invalide");
    const ro=await one(id,r);ensureWritable(ro);const [work]=await query<RowDataPacket[]>("SELECT status FROM interventions WHERE id=? AND repair_order_id=?",[intervention,id]);if(!work)throw new HttpError(404,"Intervention introuvable");const allowed:Record<string,string[]>={planned:['assigned','cancelled'],assigned:['in_progress','cancelled'],in_progress:['completed','cancelled']};if(!(allowed[work.status]??[]).includes(status))throw new HttpError(409,`Transition intervention ${work.status} → ${status} interdite`);if(status==='completed'){const [running]=await query<RowDataPacket[]>("SELECT id FROM work_sessions WHERE intervention_id=? AND status='running'",[intervention]);if(running)throw new HttpError(409,"Une session est encore active");}const x=await execute("UPDATE interventions SET status=? WHERE id=? AND repair_order_id=?",[status,intervention,id]);
    if(!x.affectedRows) throw new HttpError(404,"Intervention introuvable");
    emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'interventions'});res.json(await detail(id,r));
  }),
);
workshopRouter.post(
  "/repair-orders/:id/parts/reserve",
  authorize(...ITEMS),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),part=idOf(r.body.partId),qty=Number(r.body.quantity),ro=await one(id,r),location=r.body.locationId?idOf(r.body.locationId):null;ensureWritable(ro,['diagnosis','waiting_approval','in_progress']);
    if(qty<=0) throw new HttpError(400,"Quantité invalide");
    const reserved=await transaction(async c=>{
      const stock=r.body.partStockId?await lockPartStockById(c,idOf(r.body.partStockId),part,String(ro.agency_id)):await lockPartStock(c,part,String(ro.agency_id),location);
      if(Number(stock.current_stock)-Number(stock.reserved_stock)<qty) throw new HttpError(409,"Stock disponible insuffisant");
      await c.execute("UPDATE part_stocks SET reserved_stock=reserved_stock+? WHERE id=?",[qty,stock.id]);
      const [x]=await c.execute<ResultSetHeader>("INSERT INTO part_reservations(repair_order_id,part_id,agency_id,location_id,part_stock_id,quantity,created_by)VALUES(?,?,?,?,?,?,?)",[id,part,ro.agency_id,stock.location_id,stock.id,qty,r.user!.sub]);
      await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,'reservation',?,'repair_order',?,'Réservation OR',?)",[part,ro.agency_id,stock.location_id,qty,id,r.user!.sub]);
      return {id:x.insertId,locationId:stock.location_id};
    });
    emitToAgency(String(ro.agency_id),"parts:stock-changed",{repairOrderId:id,partId:part,agencyId:String(ro.agency_id),locationId:reserved.locationId}); res.status(201).json({id:String(reserved.id),status:"reserved"});
  }),
);
workshopRouter.patch(
  "/repair-orders/:id/parts/reservations/:reservationId",
  authorize(...ITEMS),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),reservation=idOf(r.params.reservationId),status=txt(r.body.status,"Statut",20,true)!;
    if(!["consumed","released"].includes(status)) throw new HttpError(400,"Action de réservation invalide");
    const ro=await one(id,r);ensureWritable(ro,['diagnosis','waiting_approval','in_progress']);
    const businessConfig=await getEffectiveBusinessSettings(String(ro.agency_id));
    const changed=await transaction(async c=>{
      const [rows]=await c.execute<RowDataPacket[]>("SELECT * FROM part_reservations WHERE id=? AND repair_order_id=? AND status='reserved' FOR UPDATE",[reservation,id]);
      const x=rows[0]; if(!x) throw new HttpError(404,"Réservation active introuvable");
      if(!x.part_stock_id)throw new HttpError(409,"Réservation historique non affectée à un emplacement; affectez-la avant traitement");
      const [stocks]=await c.execute<RowDataPacket[]>("SELECT * FROM part_stocks WHERE id=? AND part_id=? AND agency_id=? FOR UPDATE",[x.part_stock_id,x.part_id,ro.agency_id]);
      const stock=stocks[0];if(!stock)throw new HttpError(409,"Stock réservé introuvable");
      if(Number(stock.reserved_stock)<Number(x.quantity)||(status==='consumed'&&Number(stock.current_stock)<Number(x.quantity)))throw new HttpError(409,"Cohérence du stock réservé invalide");
      await c.execute("UPDATE part_stocks SET reserved_stock=reserved_stock-?,current_stock=current_stock-IF(?='consumed',?,0) WHERE id=?",[x.quantity,status,x.quantity,x.part_stock_id]);
      await c.execute("UPDATE part_reservations SET status=? WHERE id=?",[status,reservation]);
      if(status==='consumed'){const [parts]=await c.execute<RowDataPacket[]>("SELECT name,sale_price FROM parts WHERE id=?",[x.part_id]);await c.execute("INSERT INTO repair_order_items(repair_order_id,part_id,part_stock_id,item_type,description,quantity,unit_price,discount,tax_rate,line_total)VALUES(?,?,?,'part',?,?,?,0,?,?)",[id,x.part_id,x.part_stock_id,parts[0]?.name??`Pièce ${x.part_id}`,x.quantity,parts[0]?.sale_price??0,businessConfig.vatRate,Number(x.quantity)*Number(parts[0]?.sale_price??0)]);await c.execute("UPDATE repair_orders SET estimated_total=(SELECT COALESCE(SUM(line_total*(1+tax_rate/100)),0) FROM repair_order_items WHERE repair_order_id=? AND status='active') WHERE id=?",[id,id]);}
      await c.execute("INSERT INTO part_movements(part_id,agency_id,location_id,movement_type,quantity,reference_type,reference_id,reason,performed_by)VALUES(?,?,?,?,?,'repair_order',?,?,?)",[x.part_id,ro.agency_id,x.location_id,status==='consumed'?'repair_order':'release',status==='consumed'?-Number(x.quantity):Number(x.quantity),id,status==='consumed'?'Consommation OR':'Libération OR',r.user!.sub]);
      return {partId:String(x.part_id),locationId:x.location_id??null};
    });
    emitToAgency(String(ro.agency_id),"parts:stock-changed",{repairOrderId:id,agencyId:String(ro.agency_id),...changed}); res.json({id:reservation,status});
  }),
);
workshopRouter.post(
  "/repair-orders/:id/invoice",
  authorize(...MANAGE),
  asyncHandler(async (r,res)=>{
    const id=idOf(r.params.id),ro=await one(id,r);
    if(!["ready","invoiced"].includes(ro.status)) throw new HttpError(409,"L'OR doit être prêt avant facturation");
    const businessConfig=await getEffectiveBusinessSettings(String(ro.agency_id));
    const invoiceId=await transaction(async c=>{
      const [existing]=await c.execute<RowDataPacket[]>("SELECT id FROM invoices WHERE repair_order_id=? AND status<>'cancelled'",[id]);
      if(existing[0]) return existing[0].id;
      const [totals]=await c.execute<RowDataPacket[]>("SELECT COALESCE(SUM(line_total),0) subtotal,COALESCE(SUM(line_total*tax_rate/100),0) tax FROM repair_order_items WHERE repair_order_id=? AND status='active'",[id]);
      const totalRow=totals[0]!;
      const subtotal=Number(totalRow.subtotal),tax=Number(totalRow.tax),total=subtotal+tax,no=`FAC-SAV-${Date.now()}`;
      const [inv]=await c.execute<ResultSetHeader>("INSERT INTO invoices(invoice_number,customer_id,agency_id,repair_order_id,invoice_type,status,issue_date,subtotal,tax_total,total,balance_due,currency_code)VALUES(?,?,?,?,'workshop','issued',CURDATE(),?,?,?,?,?)",[no,ro.customer_id,ro.agency_id,id,subtotal,tax,total,total,businessConfig.currencyCode]);
      await c.execute("INSERT INTO invoice_items(invoice_id,part_id,description,quantity,unit_price,discount,tax_rate,tax_amount,line_total) SELECT ?,part_id,description,quantity,unit_price,discount,tax_rate,line_total*tax_rate/100,line_total FROM repair_order_items WHERE repair_order_id=? AND status='active'",[inv.insertId,id]);
      await c.execute("UPDATE repair_orders SET status='invoiced',actual_total=? WHERE id=?",[total,id]);
      await c.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,?,'invoiced','Facture atelier émise',?)",[id,ro.status,r.user!.sub]); return inv.insertId;
    });
    emitToAgency(String(ro.agency_id),"workshop:invoiced",{repairOrderId:id,invoiceId:String(invoiceId)});
    emitToAgency(String(ro.agency_id),"billing:invoice-created",{invoiceId:String(invoiceId),repairOrderId:id,source:'workshop'});
    res.status(201).json({id:String(invoiceId)});
  }),
);
workshopRouter.post('/repair-orders/:id/quality-control',authorize(...MANAGE),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),ro=await one(id,r);if(ro.status!=='quality_control')throw new HttpError(409,'OR non disponible pour le contrôle qualité');const result=String(r.body.result??'');if(!['passed','failed'].includes(result))throw new HttpError(400,'Résultat du contrôle qualité invalide');const checks=['plannedWorkCompleted','defectCorrected','noLeaks','levelsChecked','cleanlinessChecked'];if(result==='passed'&&!checks.every(k=>r.body[k]===true))throw new HttpError(400,'Toutes les vérifications obligatoires doivent être validées');const reason=txt(r.body.reason,'Motif',500,result==='failed');await execute('INSERT INTO repair_quality_controls(repair_order_id,planned_work_completed,defect_corrected,road_test_performed,no_leaks,levels_checked,cleanliness_checked,result,reason,observations,controlled_by)VALUES(?,?,?,?,?,?,?,?,?,?,?)',[id,Boolean(r.body.plannedWorkCompleted),Boolean(r.body.defectCorrected),Boolean(r.body.roadTestPerformed),Boolean(r.body.noLeaks),Boolean(r.body.levelsChecked),Boolean(r.body.cleanlinessChecked),result,reason,txt(r.body.observations,'Observations',5000),r.user!.sub]);emitToAgency(String(ro.agency_id),'workshop:repair-order-updated',{repairOrderId:id,agencyId:String(ro.agency_id),section:'quality-control',result});res.status(201).json(await detail(id,r));}));
workshopRouter.post('/repair-orders/:id/handover',authorize(...CREATE),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),ro=await one(id,r);if(ro.status==='delivered'||ro.status==='closed')return res.json(await detail(id,r));if(ro.status!=='invoiced')throw new HttpError(409,"L'OR doit être facturé avant la remise");const customer=txt(r.body.customerName,'Client',200,true)!,mileage=r.body.mileageOut==null?null:Number(r.body.mileageOut);if(mileage!=null&&(!Number.isInteger(mileage)||mileage<Number(ro.mileage_in??0)))throw new HttpError(400,'Kilométrage de sortie invalide');await transaction(async c=>{const [locked]=await c.execute<RowDataPacket[]>("SELECT status FROM repair_orders WHERE id=? FOR UPDATE",[id]);if(locked[0]?.status!=='invoiced')throw new HttpError(409,'Remise déjà traitée ou statut incompatible');await c.execute('INSERT INTO repair_order_handovers(repair_order_id,customer_name,mileage_out,observations,signature_data,handed_over_by)VALUES(?,?,?,?,?,?)',[id,customer,mileage,txt(r.body.observations,'Observations',5000),r.body.signatureData??null,r.user!.sub]);await c.execute("UPDATE repair_orders SET status='delivered' WHERE id=?",[id]);await c.execute("INSERT INTO repair_order_status_history(repair_order_id,old_status,new_status,reason,changed_by)VALUES(?,'invoiced','delivered','Remise du véhicule',?)",[id,r.user!.sub]);});emitToAgency(String(ro.agency_id),'workshop:status',{id,repairOrderId:id,agencyId:String(ro.agency_id),status:'delivered'});res.status(201).json(await detail(id,r));}));
workshopRouter.post(
  "/repair-orders/:id/assign",
  authorize(...MANAGE),
  asyncHandler(async (r, res) => {
    const id=idOf(r.params.id),ro=await one(id,r),tech=idOf(r.body.technicianId),bay=r.body.bayId?idOf(r.body.bayId):null,start=dateTime(r.body.startsAt,"Début"),end=dateTime(r.body.endsAt,"Fin");ensureWritable(ro);
    if(start>=end) throw new HttpError(400,"Le début doit précéder la fin");
    const scheduleId=await transaction(async c=>{
      const [technicians]=await c.execute<RowDataPacket[]>("SELECT id FROM technicians WHERE id=? AND agency_id=? AND is_active=1 FOR UPDATE",[tech,ro.agency_id]);
      if(!technicians[0]) throw new HttpError(400,"Technicien indisponible dans cette agence");
      let bayCapacity=0;if(bay){const [bays]=await c.execute<RowDataPacket[]>("SELECT id,capacity FROM workshop_bays WHERE id=? AND agency_id=? AND status='available' FOR UPDATE",[bay,ro.agency_id]);if(!bays[0])throw new HttpError(400,"Pont indisponible dans cette agence");bayCapacity=Number(bays[0].capacity);}
      if(r.body.interventionId){const [i]=await c.execute<RowDataPacket[]>("SELECT id FROM interventions WHERE id=? AND repair_order_id=? FOR UPDATE",[idOf(r.body.interventionId),id]);if(!i[0])throw new HttpError(400,"Intervention étrangère à cet OR");}
      const [technicianCollisions]=await c.execute<RowDataPacket[]>("SELECT id FROM schedules WHERE agency_id=? AND status<>'cancelled' AND technician_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[ro.agency_id,tech,end,start]);
      if(technicianCollisions[0]) throw new HttpError(409,"Technicien déjà occupé sur ce créneau");
      if(bay){const [bayCollisions]=await c.execute<RowDataPacket[]>("SELECT id FROM schedules WHERE agency_id=? AND status<>'cancelled' AND bay_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[ro.agency_id,bay,end,start]);if(bayCollisions.length>=bayCapacity)throw new HttpError(409,"Capacité du pont atteinte sur ce créneau");}
      const [absences]=await c.execute<RowDataPacket[]>("SELECT id FROM technician_unavailabilities WHERE technician_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[tech,end,start]);
      if(absences[0]) throw new HttpError(409,"Technicien indisponible sur ce créneau");
      const [x]=await c.execute<ResultSetHeader>(`INSERT INTO schedules(agency_id,technician_id,bay_id,repair_order_id,intervention_id,starts_at,ends_at,status,notes,created_by)VALUES(?,?,?,?,?,?,?,'confirmed',?,?)`,[ro.agency_id,tech,bay,id,r.body.interventionId??null,start,end,txt(r.body.notes,"Notes",2000),r.user!.sub]);
      await c.execute("INSERT INTO workshop_schedule_history(schedule_id,action,new_values,changed_by)VALUES(?,'created',JSON_OBJECT('technicianId',?,'bayId',?,'startsAt',?,'endsAt',?),?)",[x.insertId,tech,bay,start,end,r.user!.sub]);if(r.body.interventionId)await c.execute("UPDATE interventions SET technician_id=?,status=IF(status='planned','assigned',status) WHERE id=?",[tech,idOf(r.body.interventionId)]); return x.insertId;
    });
    emitToAgency(String(ro.agency_id), "workshop:assigned", {
      repairOrderId: id,
      technicianId: tech,
    });
    res.status(201).json({ id: String(scheduleId) });
  }),
);
workshopRouter.get(
  "/workshop/technicians",
  authorize(...READ),
  asyncHandler(async (r, res) => {
    const agency=agencyFromQuery(r);
    res.json(
      await query<RowDataPacket[]>(
        `SELECT t.*,CONCAT_WS(' ',u.first_name,u.last_name) name FROM technicians t JOIN users u ON u.id=t.user_id WHERE t.agency_id=? ${r.query.includeInactive==='true'?'':'AND t.is_active=1'} ORDER BY name`,
        [agency],
      ),
    );
  }),
);
workshopRouter.get("/workshop/bays",authorize(...READ),asyncHandler(async(r,res)=>{const agency=agencyFromQuery(r);res.json(await query<RowDataPacket[]>(`SELECT b.*,EXISTS(SELECT 1 FROM work_sessions ws WHERE ws.bay_id=b.id AND ws.status='running') occupied_now FROM workshop_bays b WHERE b.agency_id=? ORDER BY b.name`,[agency]));}));
workshopRouter.post("/workshop/bays",authorize(...RESOURCE_MANAGE),asyncHandler(async(r,res)=>{const agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;const x=await execute("INSERT INTO workshop_bays(agency_id,name,bay_type,capacity,status)VALUES(?,?,?,?,?)",[agency,txt(r.body.name,"Nom",100,true),txt(r.body.bayType,"Type",100),Math.max(1,Number(r.body.capacity??1)),r.body.status??'available']);emitToAgency(String(agency),'workshop:resources-changed',{type:'bay'});res.status(201).json({id:String(x.insertId)});}));
workshopRouter.patch("/workshop/bays/:id",authorize(...RESOURCE_MANAGE),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;const status=txt(r.body.status,"Statut",20,true)!;if(!['available','maintenance','inactive'].includes(status))throw new HttpError(400,"Statut de pont invalide");const x=await execute("UPDATE workshop_bays SET name=COALESCE(?,name),bay_type=COALESCE(?,bay_type),capacity=COALESCE(?,capacity),status=? WHERE id=? AND agency_id=?",[txt(r.body.name,"Nom",100),txt(r.body.bayType,"Type",100),r.body.capacity??null,status,id,agency]);if(!x.affectedRows)throw new HttpError(404,"Pont introuvable");emitToAgency(String(agency),'workshop:resources-changed',{type:'bay',id});res.json({id,status});}));
workshopRouter.post("/workshop/technicians",authorize(...RESOURCE_MANAGE),asyncHandler(async(r,res)=>{const user=idOf(r.body.userId),agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;const [valid]=await query<RowDataPacket[]>("SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles role ON role.id=ur.role_id WHERE u.id=? AND u.agency_id=? AND u.is_active=1 AND role.code='TECHNICIAN'",[user,agency]);if(!valid)throw new HttpError(400,"Utilisateur technicien invalide pour cette agence");const x=await execute("INSERT INTO technicians(user_id,agency_id,employee_code,specialty,hourly_rate,available_hours_per_day)VALUES(?,?,?,?,?,?)",[user,agency,txt(r.body.employeeCode,"Matricule",50),txt(r.body.specialty,"Spécialité",150),Number(r.body.hourlyRate??0),Number(r.body.availableHoursPerDay??8)]);emitToAgency(String(agency),'workshop:resources-changed',{type:'technician'});res.status(201).json({id:String(x.insertId)});}));
workshopRouter.patch("/workshop/technicians/:id",authorize(...RESOURCE_MANAGE),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;const x=await execute("UPDATE technicians SET employee_code=COALESCE(?,employee_code),specialty=COALESCE(?,specialty),hourly_rate=COALESCE(?,hourly_rate),available_hours_per_day=COALESCE(?,available_hours_per_day),is_active=COALESCE(?,is_active) WHERE id=? AND agency_id=?",[txt(r.body.employeeCode,"Matricule",50),txt(r.body.specialty,"Spécialité",150),r.body.hourlyRate??null,r.body.availableHoursPerDay??null,r.body.isActive??null,id,agency]);if(!x.affectedRows)throw new HttpError(404,"Technicien introuvable");emitToAgency(String(agency),'workshop:resources-changed',{type:'technician',id});res.json({id});}));
workshopRouter.post("/workshop/technicians/:id/unavailability",authorize(...RESOURCE_MANAGE),asyncHandler(async(r,res)=>{const tech=idOf(r.params.id),start=dateTime(r.body.startsAt,"Début"),end=dateTime(r.body.endsAt,"Fin"),agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;if(start>=end)throw new HttpError(400,"Créneau invalide");const [valid]=await query<RowDataPacket[]>("SELECT id FROM technicians WHERE id=? AND agency_id=?",[tech,agency]);if(!valid)throw new HttpError(404,"Technicien introuvable");const x=await execute("INSERT INTO technician_unavailabilities(technician_id,starts_at,ends_at,reason,created_by)VALUES(?,?,?,?,?)",[tech,start,end,txt(r.body.reason,"Motif",255),r.user!.sub]);emitToAgency(String(agency),'workshop:resources-changed',{type:'unavailability'});res.status(201).json({id:String(x.insertId)});}));
workshopRouter.get("/workshop/unavailabilities",authorize(...READ),asyncHandler(async(r,res)=>{const agency=agencyFromQuery(r),from=isoDate(r.query.from,"Date de début"),to=isoDate(r.query.to,"Date de fin"),periodStart=`${from} 00:00:00`,periodEnd=`${to} 23:59:59`;const params:any[]=[agency,periodEnd,periodStart];let filter="";if(r.query.technicianId){filter=" AND tu.technician_id=?";params.push(idOf(r.query.technicianId));}res.json(await query<RowDataPacket[]>(`SELECT tu.*,CONCAT_WS(' ',u.first_name,u.last_name) technician_name FROM technician_unavailabilities tu JOIN technicians t ON t.id=tu.technician_id JOIN users u ON u.id=t.user_id WHERE t.agency_id=? AND tu.starts_at<? AND tu.ends_at>?${filter} ORDER BY tu.starts_at`,params));}));
workshopRouter.delete("/workshop/unavailabilities/:id",authorize(...RESOURCE_MANAGE),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;const result=await execute("DELETE tu FROM technician_unavailabilities tu JOIN technicians t ON t.id=tu.technician_id WHERE tu.id=? AND t.agency_id=?",[id,agency]);if(!result.affectedRows)throw new HttpError(404,"Indisponibilité introuvable");emitToAgency(String(agency),'workshop:resources-changed',{type:'unavailability',id});res.json({id});}));
workshopRouter.get(
  "/workshop/planning",
  authorize(...READ),
  asyncHandler(async (r, res) => {
    const agency=agencyFromQuery(r),from=isoDate(r.query.from??r.query.date,"Date de début"),to=isoDate(r.query.to??r.query.date,"Date de fin"),periodStart=`${from} 00:00:00`,periodEnd=`${to} 23:59:59`;
    const where=["s.agency_id=?","s.starts_at<?","s.ends_at>?"],params:any[]=[agency,periodEnd,periodStart];
    if(r.query.technicianId){where.push("s.technician_id=?");params.push(idOf(r.query.technicianId));}if(r.query.bayId){where.push("s.bay_id=?");params.push(idOf(r.query.bayId));}if(r.query.status){where.push("s.status=?");params.push(r.query.status);}
    res.json(
      await query<RowDataPacket[]>(
        `SELECT s.*,ro.order_number,ro.status repair_order_status,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,v.registration_number,CONCAT(br.name,' ',m.name,' ',ve.name) vehicle_label,t.employee_code,CONCAT_WS(' ',u.first_name,u.last_name) technician_name,b.name bay_name,b.status bay_status,b.capacity bay_capacity,EXISTS(SELECT 1 FROM work_sessions ws WHERE ws.bay_id=b.id AND ws.status='running') bay_occupied_now,i.description intervention_description FROM schedules s LEFT JOIN repair_orders ro ON ro.id=s.repair_order_id LEFT JOIN customers c ON c.id=ro.customer_id LEFT JOIN vehicles v ON v.id=ro.vehicle_id LEFT JOIN versions ve ON ve.id=v.version_id LEFT JOIN models m ON m.id=ve.model_id LEFT JOIN brands br ON br.id=m.brand_id LEFT JOIN interventions i ON i.id=s.intervention_id LEFT JOIN technicians t ON t.id=s.technician_id LEFT JOIN users u ON u.id=t.user_id LEFT JOIN workshop_bays b ON b.id=s.bay_id WHERE ${where.join(' AND ')} ORDER BY s.starts_at`,params,
      ),
    );
  }),
);
workshopRouter.get("/workshop/stats",authorize(...READ),asyncHandler(async(r,res)=>{const agency=agencyFromQuery(r),from=isoDate(r.query.from??r.query.date,"Date de début"),to=isoDate(r.query.to??r.query.date,"Date de fin"),periodStart=`${from} 00:00:00`,periodEnd=`${to} 23:59:59`;const [x]=await query<RowDataPacket[]>(`SELECT (SELECT COUNT(*) FROM technicians WHERE agency_id=? AND is_active=1) technicians,(SELECT COALESCE(SUM(available_hours_per_day),0) FROM technicians WHERE agency_id=? AND is_active=1) technician_daily_capacity,(SELECT COUNT(*) FROM workshop_bays WHERE agency_id=? AND status='available') bays,(SELECT COALESCE(SUM(capacity),0) FROM workshop_bays WHERE agency_id=? AND status='available') bay_units,COUNT(DISTINCT s.id) assignments,COALESCE(SUM(TIMESTAMPDIFF(MINUTE,GREATEST(s.starts_at,?),LEAST(s.ends_at,?)))/60,0) scheduled_hours,COALESCE((SELECT SUM(te.hours) FROM time_entries te JOIN technicians t ON t.id=te.technician_id WHERE t.agency_id=? AND te.entry_date BETWEEN ? AND ?),0) actual_hours FROM schedules s WHERE s.agency_id=? AND s.status<>'cancelled' AND s.starts_at<? AND s.ends_at>?`,[agency,agency,agency,agency,periodStart,periodEnd,agency,from,to,agency,periodEnd,periodStart]);const days=Math.max(1,Math.round((Date.parse(to)-Date.parse(from))/86400000)+1),capacity=Number(x?.technician_daily_capacity??0)*days,bayCapacity=Number(x?.bay_units??0)*8*days;res.json({...x,capacity_hours:capacity,bay_capacity_hours:bayCapacity,technician_occupation_rate:capacity?Math.round(Number(x?.scheduled_hours??0)/capacity*100):0,bay_occupation_rate:bayCapacity?Math.round(Number(x?.scheduled_hours??0)/bayCapacity*100):0,productivity_rate:Number(x?.scheduled_hours??0)?Math.round(Number(x?.actual_hours??0)/Number(x?.scheduled_hours)*100):0});}));
workshopRouter.patch("/workshop/schedules/:id",authorize(...MANAGE),asyncHandler(async(r,res)=>{const schedule=idOf(r.params.id),agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!,tech=idOf(r.body.technicianId),bay=r.body.bayId?idOf(r.body.bayId):null,start=dateTime(r.body.startsAt,"Début"),end=dateTime(r.body.endsAt,"Fin");if(start>=end)throw new HttpError(400,"Créneau invalide");await transaction(async c=>{const [old]=await c.execute<RowDataPacket[]>("SELECT * FROM schedules WHERE id=? AND agency_id=? FOR UPDATE",[schedule,agency]);if(!old[0])throw new HttpError(404,"Affectation introuvable");const [resources]=await c.execute<RowDataPacket[]>("SELECT t.id,b.capacity FROM technicians t LEFT JOIN workshop_bays b ON b.id=? AND b.agency_id=t.agency_id AND b.status='available' WHERE t.id=? AND t.agency_id=? AND t.is_active=1 AND (? IS NULL OR b.id IS NOT NULL)",[bay,tech,agency,bay]);if(!resources[0])throw new HttpError(400,"Ressource atelier invalide");const [technicianCollision]=await c.execute<RowDataPacket[]>("SELECT id FROM schedules WHERE id<>? AND agency_id=? AND status<>'cancelled' AND technician_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[schedule,agency,tech,end,start]);if(technicianCollision[0])throw new HttpError(409,"Technicien déjà occupé sur ce créneau");if(bay){const [bayCollisions]=await c.execute<RowDataPacket[]>("SELECT id FROM schedules WHERE id<>? AND agency_id=? AND status<>'cancelled' AND bay_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[schedule,agency,bay,end,start]);if(bayCollisions.length>=Number(resources[0].capacity))throw new HttpError(409,"Capacité du pont atteinte sur ce créneau");}const [absence]=await c.execute<RowDataPacket[]>("SELECT id FROM technician_unavailabilities WHERE technician_id=? AND starts_at<? AND ends_at>? FOR UPDATE",[tech,end,start]);if(absence[0])throw new HttpError(409,"Technicien indisponible sur ce créneau");await c.execute("UPDATE schedules SET technician_id=?,bay_id=?,starts_at=?,ends_at=?,notes=COALESCE(?,notes) WHERE id=?",[tech,bay,start,end,txt(r.body.notes,"Notes",2000),schedule]);await c.execute("INSERT INTO workshop_schedule_history(schedule_id,action,old_values,new_values,changed_by)VALUES(?,'updated',?,JSON_OBJECT('technicianId',?,'bayId',?,'startsAt',?,'endsAt',?),?)",[schedule,JSON.stringify(old[0]),tech,bay,start,end,r.user!.sub]);});emitToAgency(String(agency),'workshop:schedule-updated',{id:schedule});res.json({id:schedule});}));
workshopRouter.delete("/workshop/schedules/:id",authorize(...MANAGE),asyncHandler(async(r,res)=>{const id=idOf(r.params.id),agency=unrestricted(r)&&r.body.agencyId?idOf(r.body.agencyId):r.user!.agencyId!;await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>("SELECT * FROM schedules WHERE id=? AND agency_id=? AND status<>'cancelled' FOR UPDATE",[id,agency]);if(!rows[0])throw new HttpError(404,"Affectation active introuvable");await c.execute("UPDATE schedules SET status='cancelled' WHERE id=?",[id]);await c.execute("INSERT INTO workshop_schedule_history(schedule_id,action,old_values,new_values,changed_by)VALUES(?,'cancelled',?,JSON_OBJECT('status','cancelled'),?)",[id,JSON.stringify(rows[0]),r.user!.sub]);});emitToAgency(String(agency),'workshop:schedule-cancelled',{id});res.json({id,status:'cancelled'});}));
workshopRouter.post(
  "/repair-orders/:id/sessions/start",
  authorize(...OPERATE),
  asyncHandler(async (r, res) => {
    const id=idOf(r.params.id),ro=await one(id,r),requested=idOf(r.body.technicianId),intervention=idOf(r.body.interventionId),bay=r.body.bayId?idOf(r.body.bayId):null;if(ro.status!=='in_progress')throw new HttpError(409,"L'OR doit être en cours pour démarrer une session");
    const sessionId=await transaction(async c=>{const [techs]=await c.execute<RowDataPacket[]>("SELECT t.*,u.id user_id FROM technicians t JOIN users u ON u.id=t.user_id WHERE t.id=? AND t.agency_id=? AND t.is_active=1 FOR UPDATE",[requested,ro.agency_id]);const tech=techs[0];if(!tech)throw new HttpError(400,"Technicien invalide");if(r.user!.roles.includes('TECHNICIAN')&&String(tech.user_id)!==r.user!.sub)throw new HttpError(403,"Un technicien ne peut pointer que pour lui-même");const [interventions]=await c.execute<RowDataPacket[]>("SELECT id,technician_id,status FROM interventions WHERE id=? AND repair_order_id=? FOR UPDATE",[intervention,id]);const work=interventions[0];if(!work||['completed','cancelled'].includes(work.status))throw new HttpError(400,"Intervention non disponible");if(work.technician_id&&String(work.technician_id)!==requested)throw new HttpError(409,"Intervention affectée à un autre technicien");if(bay){const [bays]=await c.execute<RowDataPacket[]>("SELECT id FROM workshop_bays WHERE id=? AND agency_id=? AND status='available' FOR UPDATE",[bay,ro.agency_id]);if(!bays[0])throw new HttpError(400,"Pont indisponible dans cette agence");}const [running]=await c.execute<RowDataPacket[]>("SELECT id FROM work_sessions WHERE (technician_id=? OR (? IS NOT NULL AND bay_id=?)) AND status='running' FOR UPDATE",[requested,bay,bay]);if(running[0])throw new HttpError(409,"Technicien ou pont déjà en activité");const [x]=await c.execute<ResultSetHeader>(`INSERT INTO work_sessions(repair_order_id,technician_id,intervention_id,bay_id,started_at,status,created_by)VALUES(?,?,?,?,NOW(),'running',?)`,[id,requested,intervention,bay,r.user!.sub]);await c.execute("UPDATE interventions SET technician_id=?,status='in_progress' WHERE id=?",[requested,intervention]);return x.insertId;});emitToAgency(String(ro.agency_id),'workshop:session-started',{repairOrderId:id,agencyId:String(ro.agency_id),sessionId:String(sessionId),interventionId:intervention});res.status(201).json({id:String(sessionId)});
  }),
);
workshopRouter.patch(
  "/repair-orders/:id/sessions/:sessionId/stop",
  authorize(...OPERATE),
  asyncHandler(async (r, res) => {
    const id = idOf(r.params.id),
      session = idOf(r.params.sessionId);
    const ro=await one(id,r);if(ro.status!=='in_progress')throw new HttpError(409,"L'OR n'autorise pas le pointage");await transaction(async c=>{const [rows]=await c.execute<RowDataPacket[]>("SELECT ws.*,t.user_id,t.agency_id FROM work_sessions ws JOIN technicians t ON t.id=ws.technician_id WHERE ws.id=? AND ws.repair_order_id=? FOR UPDATE",[session,id]);const ws=rows[0];if(!ws)throw new HttpError(404,"Session introuvable");if(ws.status!=='running')throw new HttpError(409,"Cette session est déjà arrêtée");if(String(ws.agency_id)!==String(ro.agency_id))throw new HttpError(403,"Session hors agence");if(r.user!.roles.includes('TECHNICIAN')&&String(ws.user_id)!==r.user!.sub)throw new HttpError(403,"Un technicien ne peut arrêter que son pointage");await c.execute("UPDATE work_sessions SET ended_at=NOW(),status='completed' WHERE id=?",[session]);await c.execute("INSERT INTO time_entries(technician_id,repair_order_id,intervention_id,work_session_id,entry_date,hours,productive,notes) SELECT technician_id,repair_order_id,intervention_id,id,CURDATE(),GREATEST(TIMESTAMPDIFF(SECOND,started_at,NOW())/3600,0),TRUE,'Session atelier' FROM work_sessions WHERE id=?",[session]);if(ws.intervention_id)await c.execute("UPDATE interventions SET actual_hours=(SELECT COALESCE(SUM(hours),0) FROM time_entries WHERE intervention_id=?),status='in_progress' WHERE id=?",[ws.intervention_id,ws.intervention_id]);});emitToAgency(String(ro.agency_id),'workshop:session-stopped',{repairOrderId:id,agencyId:String(ro.agency_id),sessionId:session});
    res.json(await detail(id, r));
  }),
);
workshopRouter.get(
  "/repair-orders/:id/pdf",
  authorize(...READ),
  asyncHandler(async (r, res) => {
    const ro = await detail(idOf(r.params.id), r),identity=await getBusinessIdentity(String((await one(idOf(r.params.id),r)).agency_id)),
      doc = new PDFDocument(),
      chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((ok) =>
      doc.on("end", () => ok(Buffer.concat(chunks))),
    );
    doc
      .fontSize(20)
      .fillColor("#8f1722")
      .text(identity.legalName)
      .moveDown()
      .fontSize(16)
      .fillColor("#111")
      .text(`ORDRE DE RÉPARATION ${ro.order_number}`)
      .moveDown();
    for (const [k, v] of Object.entries({
      Client: ro.customer_name,
      Véhicule: ro.vehicle_label,
      VIN: ro.vin,
      Kilométrage: ro.mileage_in,
      Statut: ro.status,
      Symptômes: ro.complaint,
      Total: `${ro.estimated_total} ${identity.currencyCode}`,
      Garantie:ro.warranty_covered?`Oui — ${ro.warranty_reference??'sans référence'}`:'Non',
    }))
      doc.fontSize(10).text(`${k}: ${v ?? "—"}`);
    if(ro.diagnostics.length){doc.moveDown().fontSize(13).text('Diagnostics');for(const diagnostic of ro.diagnostics)doc.fontSize(9).text(`• ${diagnostic.diagnosis}${diagnostic.recommendations?` — ${diagnostic.recommendations}`:''}`);}
    if(ro.interventions.length){doc.moveDown().fontSize(13).text('Interventions');for(const intervention of ro.interventions)doc.fontSize(9).text(`• ${intervention.description} — prévu ${intervention.planned_hours} h / réel ${intervention.actual_hours} h — ${intervention.status}`);}
    if(ro.items.length){doc.moveDown().fontSize(13).text('Lignes facturables');for(const item of ro.items.filter((x:any)=>x.status!=='cancelled'))doc.fontSize(9).text(`• ${item.description}: ${item.quantity} × ${item.unit_price} ${identity.currencyCode}, TVA ${item.tax_rate}%`);}
    if(ro.qualityControls[0])doc.moveDown().fontSize(11).text(`Contrôle qualité: ${ro.qualityControls[0].result==='passed'?'validé':'refusé'} — ${ro.qualityControls[0].observations??''}`);
    doc.end();
    const pdf = await done;
    res
      .type("pdf")
      .setHeader(
        "Content-Disposition",
        `inline; filename="${ro.order_number}.pdf"`,
      );
    res.send(pdf);
  }),
);
