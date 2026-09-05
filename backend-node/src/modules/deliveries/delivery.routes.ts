import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Router, type Request } from "express";
import PDFDocument from "pdfkit";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { execute, query, transaction } from "../../config/database.js";
import { authorize, unrestricted } from "../../middleware/authorize.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { emitToAgency } from "../../realtime/socket.js";
import { HttpError } from "../../shared/http-error.js";
import { notifyRoles as createRoleNotifications } from "../notifications/notification.service.js";

export const deliveryRouter = Router();
const READ = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "SALES_MANAGER",
  "SALES_AGENT",
  "DELIVERY_MANAGER",
  "RECEPTIONIST",
];
const CREATE = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "SALES_MANAGER",
  "SALES_AGENT",
  "DELIVERY_MANAGER",
];
const OPERATE = ["SUPER_ADMIN", "DIRECTOR", "DELIVERY_MANAGER"];
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
  cancelled: ["planned"],
};
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
const agency = (request: Request, requested?: unknown) => {
  if (unrestricted(request) && requested) return String(requested);
  if (!request.user?.agencyId)
    throw new HttpError(403, "Aucune agence associée");
  return request.user.agencyId;
};
const scope = (request: Request, alias = "d") =>
  unrestricted(request)
    ? { sql: "1=1", params: [] as unknown[] }
    : { sql: `${alias}.agency_id=?`, params: [request.user!.agencyId] };
const selection = `SELECT d.*,s.sale_number,s.status sale_status,s.total sale_total,s.balance_due,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,c.phone,c.email,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,v.vin,v.registration_number,v.mileage vehicle_mileage,CONCAT_WS(' ',sp.first_name,sp.last_name) salesperson_name,CONCAT_WS(' ',du.first_name,du.last_name) delivery_specialist_name,a.name agency_name FROM deliveries d JOIN sales s ON s.id=d.sale_id JOIN customers c ON c.id=d.customer_id JOIN vehicles v ON v.id=d.vehicle_id JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id LEFT JOIN users sp ON sp.id=s.salesperson_id LEFT JOIN users du ON du.id=d.delivery_specialist_id JOIN agencies a ON a.id=d.agency_id`;

async function accessible(id: string, request: Request): Promise<any> {
  const scoped = scope(request);
  const [row] = await query<RowDataPacket[]>(
    `${selection} WHERE d.id=? AND ${scoped.sql}`,
    [id, ...scoped.params],
  );
  if (!row) throw new HttpError(404, "Livraison introuvable");
  return row;
}
async function detail(id: string, request: Request): Promise<any> {
  const row = await accessible(id, request);
  const [checklist, documents, signatures, history] = await Promise.all([
    query<RowDataPacket[]>(
      "SELECT dc.*,CONCAT_WS(' ',u.first_name,u.last_name) completed_by_name FROM delivery_checklists dc LEFT JOIN users u ON u.id=dc.completed_by WHERE dc.delivery_id=? ORDER BY dc.id",
      [id],
    ),
    query<RowDataPacket[]>(
      "SELECT dd.*,CONCAT_WS(' ',u.first_name,u.last_name) received_by_name FROM delivery_documents dd LEFT JOIN users u ON u.id=dd.received_by WHERE dd.delivery_id=? ORDER BY dd.id",
      [id],
    ),
    query<RowDataPacket[]>(
      "SELECT id,signer_name,signed_by,consent_text,document_hash,signed_at,ip_address FROM delivery_signatures WHERE delivery_id=? ORDER BY signed_at DESC",
      [id],
    ),
    query<RowDataPacket[]>(
      "SELECT h.*,CONCAT_WS(' ',u.first_name,u.last_name) changed_by_name FROM delivery_status_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.delivery_id=? ORDER BY h.changed_at DESC",
      [id],
    ),
  ]);
  return { ...row, checklist, documents, signatures, history };
}
async function notifyRoles(
  agencyId: string,
  roles: string[],
  subject: string,
  message: string,
  referenceId: string,
) {
  await createRoleNotifications({agencyId,roles,includeGlobalRoles:['DIRECTOR','SUPER_ADMIN'],subject,message,eventType:'delivery.status_changed',referenceType:'delivery',referenceId,priority:'normal'});
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
  authorize(...READ),
  asyncHandler(async (request, response) => {
    const scoped = scope(request),
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
      rows.map((row) => ({
        ...row,
        checklist_progress: progress.get(String(row.id)) ?? {
          total: 0,
          completed: 0,
        },
      })),
    );
  }),
);

deliveryRouter.get(
  "/deliveries/stats",
  authorize(...READ),
  asyncHandler(async (request, response) => {
    const scoped = scope(request);
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
deliveryRouter.get(
  "/deliveries/:id",
  authorize(...READ),
  asyncHandler(async (request, response) =>
    response.json(await detail(idOf(request.params.id), request)),
  ),
);

deliveryRouter.post(
  "/deliveries",
  authorize(...CREATE),
  asyncHandler(async (request, response) => {
    const saleId = idOf(String(request.body.saleId)),
      scheduledAt = mysqlDateTime(request.body.scheduledAt, "Date de livraison"),
      location = text(request.body.deliveryLocation, "Lieu", 255),
      notes = text(request.body.customerNotes, "Notes", 5000),
      specialist = request.body.deliverySpecialistId
        ? idOf(String(request.body.deliverySpecialistId))
        : null;
    const [sale] = await query<RowDataPacket[]>(
      `SELECT s.customer_id,s.agency_id,s.status,s.balance_due,si.vehicle_id FROM sales s JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL WHERE s.id=?`,
      [saleId],
    );
    if (!sale) throw new HttpError(404, "Vente ou véhicule introuvable");
    const agencyId = agency(request, sale.agency_id);
    if (String(sale.agency_id) !== agencyId)
      throw new HttpError(403, "Vente rattachée à une autre agence");
    if (sale.status !== "ready_for_delivery")
      throw new HttpError(409, "La vente doit être prête à livrer");
    if (specialist) {
      const [u] = await query<RowDataPacket[]>(
        `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND u.agency_id=? AND u.is_active=TRUE AND r.code='DELIVERY_MANAGER'`,
        [specialist, agencyId],
      );
      if (!u) throw new HttpError(400, "Responsable livraison invalide");
    }
    const deliveryNumber = `LIV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString().slice(-6)}`;
    const id = await transaction(async (connection) => {
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
          sale.customer_id,
          sale.vehicle_id,
          agencyId,
          specialist,
          scheduledAt,
          location,
          notes,
          request.user!.sub,
        ],
      );
      const [templates] = await connection.execute<RowDataPacket[]>(
        `SELECT item_name,is_required FROM delivery_checklist_templates WHERE is_active=TRUE AND (agency_id IS NULL OR agency_id=?) ORDER BY agency_id IS NULL DESC,sort_order,id`,
        [agencyId],
      );
      for (const item of templates)
        await connection.execute(
          "INSERT INTO delivery_checklists(delivery_id,item_name,is_required) VALUES(?,?,?)",
          [result.insertId, item.item_name, item.is_required],
        );
      await connection.execute(
        `INSERT INTO delivery_status_history(delivery_id,new_status,reason,changed_by) VALUES(?,'planned','Planification',?)`,
        [result.insertId, request.user!.sub],
      );
      return String(result.insertId);
    });
    emitToAgency(agencyId, "deliveries:created", { id, deliveryNumber });
    await notifyRoles(
      agencyId,
      ["DELIVERY_MANAGER"],
      "Livraison à préparer",
      `${deliveryNumber} est planifiée le ${scheduledAt}`,
      id,
    );
    response.status(201).json(await detail(id, request));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/status",
  authorize(...OPERATE),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      row = await accessible(id, request),
      status = text(request.body.status, "Statut", 30, true)!;
    if (!STATUSES.includes(status)) throw new HttpError(400, "Statut invalide");
    if (!ALLOWED[row.status]?.includes(status))
      throw new HttpError(
        409,
        `Transition ${row.status} → ${status} interdite`,
      );
    if (status === "ready") {
      const [pending] = await query<RowDataPacket[]>(
        "SELECT COUNT(*) count FROM delivery_checklists WHERE delivery_id=? AND is_required=TRUE AND is_completed=FALSE",
        [id],
      );
      if (Number(pending?.count ?? 0) > 0)
        throw new HttpError(
          409,
          "Tous les contrôles obligatoires doivent être validés",
        );
    }
    if (status === "delivered")
      throw new HttpError(
        409,
        "Utilisez la signature client pour livrer le véhicule",
      );
    const reason = text(
      request.body.reason,
      "Motif",
      500,
      status === "cancelled",
    );
    await transaction(async (connection) => {
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
    });
    emitToAgency(String(row.agency_id), "deliveries:status", { id, status });
    response.json(await detail(id, request));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/reschedule",
  authorize(...OPERATE),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      row = await accessible(id, request),
      scheduled = mysqlDateTime(request.body.scheduledAt, "Nouvelle date"),
      reason = text(request.body.reason, "Motif du report", 500, true)!;
    if (row.status === "delivered")
      throw new HttpError(
        409,
        "Une livraison réalisée ne peut pas être reportée",
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
      ["SALES_AGENT", "SALES_MANAGER"],
      "Livraison reportée",
      `${row.delivery_number}: ${reason}`,
      id,
    );
    response.json(await detail(id, request));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/checklist/:itemId",
  authorize(...OPERATE),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      itemId = idOf(request.params.itemId),
      row = await accessible(id, request);
    if (["delivered", "cancelled"].includes(row.status))
      throw new HttpError(409, "Cette livraison ne peut plus être modifiée");
    if (!["preparing", "quality_control"].includes(row.status))
      throw new HttpError(409, "Démarrez la préparation avant la checklist");
    const completed = Boolean(request.body.completed);
    const result = await execute(
      "UPDATE delivery_checklists SET is_completed=?,completed_by=?,completed_at=IF(?,NOW(),NULL),notes=? WHERE id=? AND delivery_id=?",
      [
        completed,
        completed ? request.user!.sub : null,
        completed,
        text(request.body.notes, "Notes", 5000),
        itemId,
        id,
      ],
    );
    if (!result.affectedRows)
      throw new HttpError(404, "Élément de checklist introuvable");
    emitToAgency(String(row.agency_id), "deliveries:checklist", {
      deliveryId: id,
      itemId,
      completed,
    });
    response.json(await detail(id, request));
  }),
);

deliveryRouter.post(
  "/deliveries/:id/documents",
  authorize(...OPERATE),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      row = await accessible(id, request),
      name = text(request.body.documentName, "Nom du document", 200, true)!,
      type = text(request.body.documentType, "Type", 100),
      fileName = text(request.body.fileName, "Nom du fichier", 255),
      mime = text(request.body.mimeType, "Type MIME", 100),
      base64 = text(request.body.dataBase64, "Fichier", 20_000_000),
      required = Boolean(request.body.isRequired);
    let url: string | null = null,
      size: number | null = null;
    if (base64) {
      if (
        !mime ||
        !["application/pdf", "image/png", "image/jpeg"].includes(mime)
      )
        throw new HttpError(400, "Format de document non autorisé");
      const buffer = Buffer.from(
        base64.replace(/^data:[^;]+;base64,/, ""),
        "base64",
      );
      if (!buffer.length || buffer.length > 10_000_000)
        throw new HttpError(400, "Fichier vide ou supérieur à 10 Mo");
      const extension =
        mime === "application/pdf"
          ? ".pdf"
          : mime === "image/png"
            ? ".png"
            : ".jpg";
      const directory = path.resolve(
        process.env.UPLOAD_DIR ?? "uploads",
        "deliveries",
        id,
      );
      await mkdir(directory, { recursive: true });
      const stored = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
      await writeFile(path.join(directory, stored), buffer);
      url = `/uploads/deliveries/${id}/${stored}`;
      size = buffer.length;
    }
    const result = await execute(
      `INSERT INTO delivery_documents(delivery_id,document_name,document_type,document_url,file_name,mime_type,file_size,is_required,received,received_by,received_at) VALUES(?,?,?,?,?,?,?,?,TRUE,?,NOW())`,
      [id, name, type, url, fileName, mime, size, required, request.user!.sub],
    );
    emitToAgency(String(row.agency_id), "deliveries:document", {
      deliveryId: id,
      documentId: String(result.insertId),
    });
    response.status(201).json(await detail(id, request));
  }),
);

deliveryRouter.patch(
  "/deliveries/:id/documents/:documentId",
  authorize(...OPERATE),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      documentId = idOf(request.params.documentId),
      row = await accessible(id, request),
      received = Boolean(request.body.received);
    const result = await execute(
      "UPDATE delivery_documents SET received=?,received_by=?,received_at=IF(?,NOW(),NULL) WHERE id=? AND delivery_id=?",
      [received, received ? request.user!.sub : null, received, documentId, id],
    );
    if (!result.affectedRows) throw new HttpError(404, "Document introuvable");
    response.json(await detail(id, request));
  }),
);

deliveryRouter.post(
  "/deliveries/:id/sign",
  authorize(...OPERATE),
  asyncHandler(async (request, response) => {
    const id = idOf(request.params.id),
      row = await accessible(id, request),
      signer = text(request.body.signerName, "Signataire", 200, true)!,
      signature = text(
        request.body.signatureData,
        "Signature",
        2_000_000,
        true,
      )!,
      consent = text(request.body.consentText, "Consentement", 500, true)!;
    if (row.status !== "ready")
      throw new HttpError(
        409,
        "La livraison doit être validée avant signature",
      );
    if (
      !signature.startsWith("data:image/png;base64,") ||
      signature.length < 200
    )
      throw new HttpError(400, "Une signature manuscrite PNG est requise");
    const mileage = Number(request.body.mileageAtDelivery);
    if (!Number.isInteger(mileage) || mileage < Number(row.vehicle_mileage))
      throw new HttpError(400, "Kilométrage de livraison invalide");
    const [pendingDocs] = await query<RowDataPacket[]>(
      "SELECT COUNT(*) count FROM delivery_documents WHERE delivery_id=? AND is_required=TRUE AND received=FALSE",
      [id],
    );
    if (Number(pendingDocs?.count ?? 0) > 0)
      throw new HttpError(
        409,
        "Tous les documents obligatoires doivent être remis",
      );
    if (Number(row.balance_due) > 0)
      throw new HttpError(409, `Solde client restant: ${row.balance_due} XAF`);
    const hash = createHash("sha256")
      .update(`${id}|${signer}|${signature}|${new Date().toISOString()}`)
      .digest("hex");
    await transaction(async (connection) => {
      await connection.execute(
        "INSERT INTO delivery_signatures(delivery_id,signer_name,signed_by,signature_data,consent_text,document_hash,ip_address) VALUES(?,?,?,?,?,?,?)",
        [id, signer, request.user!.sub, signature, consent, hash, request.ip ?? null],
      );
      await connection.execute(
        `UPDATE deliveries SET status='delivered',delivered_at=NOW(),mileage_at_delivery=? WHERE id=?`,
        [mileage, id],
      );
      await connection.execute(
        `UPDATE sales SET status='delivered',sold_at=COALESCE(sold_at,NOW()) WHERE id=?`,
        [row.sale_id],
      );
      await connection.execute(
        `UPDATE vehicles SET status='delivered',mileage=GREATEST(mileage,?) WHERE id=?`,
        [mileage, row.vehicle_id],
      );
      await connection.execute(
        `INSERT INTO vehicle_status_history(vehicle_id,old_status,new_status,changed_by,reason) VALUES(?,'sold','delivered',?,'Livraison client signée')`,
        [row.vehicle_id, request.user!.sub],
      );
      await connection.execute(
        `INSERT INTO delivery_status_history(delivery_id,old_status,new_status,reason,changed_by) VALUES(?,'ready','delivered','Signature client',?)`,
        [id, request.user!.sub],
      );
    });
    emitToAgency(String(row.agency_id), "deliveries:delivered", { id });
    await notifyRoles(
      String(row.agency_id),
      ["SALES_AGENT", "SALES_MANAGER", "DIRECTOR"],
      "Véhicule livré",
      `${row.delivery_number} a été signé par ${signer}`,
      id,
    );
    response.json(await detail(id, request));
  }),
);

deliveryRouter.get(
  "/deliveries/:id/pdf",
  authorize(...READ),
  asyncHandler(async (request, response) => {
    const row = await detail(idOf(request.params.id), request);
    const buffer = await pdfBuffer((doc) => {
      header(doc, "PROCÈS-VERBAL DE LIVRAISON");
      line(doc, "Numéro", row.delivery_number);
      line(doc, "Date prévue", row.scheduled_at);
      line(doc, "Date de remise", row.delivered_at);
      line(doc, "Client", row.customer_name);
      line(doc, "Véhicule", row.vehicle_label);
      line(doc, "VIN", row.vin);
      line(doc, "Immatriculation", row.registration_number);
      line(doc, "Kilométrage", row.mileage_at_delivery);
      line(doc, "Lieu", row.delivery_location);
      doc.moveDown().fontSize(11).font("Helvetica-Bold").text("Contrôles");
      for (const item of row.checklist)
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(`${item.is_completed ? "✓" : "○"} ${item.item_name}`);
      doc.moveDown();
      line(doc, "Signataire", row.signatures[0]?.signer_name);
      line(doc, "Signature enregistrée le", row.signatures[0]?.signed_at);
      line(doc, "Empreinte", row.signatures[0]?.document_hash);
      doc
        .moveDown(2)
        .fontSize(8)
        .fillColor("#64748b")
        .text(
          `Document généré le ${new Date().toLocaleString("fr-CG")} — devise XAF`,
          { align: "center" },
        );
    });
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
  authorize(...READ),
  asyncHandler(async (request, response) => {
    const scoped = scope(request),
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
