import type { Request } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { query, transaction } from "../../config/database.js";
import { HttpError } from "../../shared/http-error.js";
import {
  assertPermission,
  type PermissionScope,
} from "../rbac/rbac.service.js";
import { writeAudit } from "../activity/audit-writer.js";
import { emitToDomainAgenciesAndGlobals } from "../../realtime/socket.js";

type RP =
  | "treasury.coverage.view"
  | "treasury.reservation.view"
  | "treasury.reservation.create"
  | "treasury.reservation.release"
  | "treasury.reservation.adjust"
  | "treasury.reservation.submit"
  | "treasury.reservation.approve"
  | "treasury.reservation.cancel"
  | "treasury.reservation.expire";
const id = (v: unknown) => {
  const x = String(v ?? "");
  if (!/^[1-9]\d*$/.test(x)) throw new HttpError(400, "Identifiant invalide");
  return x;
};
const amount = (v: unknown) => {
  const x = String(v ?? "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(x) || Number(x) <= 0)
    throw new HttpError(400, "Montant strictement positif requis");
  return Number(x);
};
const reason = (v: unknown) => {
  const x = typeof v === "string" ? v.trim() : "";
  if (x.length < 3 || x.length > 500)
    throw new HttpError(
      400,
      "Le motif doit contenir entre 3 et 500 caractères",
    );
  return x;
};
const requestId = (v: unknown) => {
  const x = String(v ?? "").toLowerCase();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      x,
    )
  )
    throw new HttpError(400, "Identifiant de requête invalide");
  return x;
};
const shortText=(v:unknown,label:string,max=255)=>{const x=typeof v==='string'?v.trim():'';if(!x||x.length>max)throw new HttpError(400,`${label} obligatoire`);return x};
const dueDate=(v:unknown)=>{const x=String(v??'');if(!/^\d{4}-\d{2}-\d{2}$/.test(x)||Number.isNaN(Date.parse(`${x}T00:00:00Z`)))throw new HttpError(400,'Échéance invalide');return x};
function accountScope(
  r: Request,
  s: PermissionScope | null,
  a = "ta",
): { sql: string; params: any[] } {
  if (s === "GLOBAL") return { sql: "TRUE", params: [] };
  if (s === "CONCESSION")
    return {
      sql: `${a}.concession_id=(SELECT concession_id FROM agencies WHERE id=?)`,
      params: [r.user!.agencyId],
    };
  if (s === "AGENCY")
    return { sql: `${a}.agency_id=?`, params: [r.user!.agencyId] };
  throw new HttpError(
    403,
    "Le scope OWN ne gouverne pas les ressources financières collectives",
  );
}
function budgetScope(
  r: Request,
  s: PermissionScope | null,
): { sql: string; params: any[] } {
  if (s === "GLOBAL") return { sql: "TRUE", params: [] };
  if (s === "CONCESSION")
    return {
      sql: "COALESCE(b.concession_id,ba.concession_id)=(SELECT concession_id FROM agencies WHERE id=?)",
      params: [r.user!.agencyId],
    };
  if (s === "AGENCY")
    return {
      sql: "b.scope_type='agency' AND b.agency_id=?",
      params: [r.user!.agencyId],
    };
  throw new HttpError(
    403,
    "Le scope OWN ne gouverne pas les ressources financières collectives",
  );
}
const permissionScope = (r: Request, p: RP) => assertPermission(r, p);
const balanceSql =
  "COALESCE(SUM(CASE WHEN tm.status='POSTED' AND tm.direction='IN' THEN tm.amount WHEN tm.status='POSTED' THEN -tm.amount ELSE 0 END),0)";
const disbursedSql =
  "SELECT COALESCE(SUM(CASE WHEN reversal.id IS NULL THEN d.amount ELSE 0 END),0) FROM budget_expense_disbursements d JOIN treasury_movements original ON original.source_type='BUDGET_EXPENSE_DISBURSEMENT' AND CAST(original.source_id AS UNSIGNED)=d.id AND original.event_type='POSTED' LEFT JOIN treasury_movements reversal ON reversal.reversal_of_id=original.id WHERE d.budget_expense_id=e.id";

export async function coverage(r: Request) {
  const s = await permissionScope(r, "treasury.coverage.view"),
    p = accountScope(r, s);
  const rows = await query<RowDataPacket[]>(
    `SELECT ta.currency_code,COUNT(DISTINCT ta.id) account_count,${balanceSql} eligible_cash,COALESCE((SELECT SUM(tr.active_amount) FROM treasury_reservations tr JOIN treasury_accounts rx ON rx.id=tr.account_id WHERE tr.status='ACTIVE' AND rx.currency_code=ta.currency_code AND ${p.sql.replaceAll("ta.", "rx.")}),0) reserved FROM treasury_accounts ta LEFT JOIN treasury_movements tm ON tm.account_id=ta.id WHERE ta.is_active=TRUE AND ta.account_type IN('CASH','BANK') AND ${p.sql} GROUP BY ta.currency_code`,
    [...p.params, ...p.params],
  );
  const bp = budgetScope(r, s),
    engagements = await query<RowDataPacket[]>(
      `SELECT co.currency_code,SUM(GREATEST(0,e.amount-(${disbursedSql}))) remaining FROM budget_expenses e JOIN budgets b ON b.id=e.budget_id LEFT JOIN agencies ba ON ba.id=b.agency_id JOIN concessions co ON co.id=COALESCE(b.concession_id,ba.concession_id) WHERE e.approval_status='approved' AND ${bp.sql} GROUP BY co.currency_code`,
      bp.params,
    );
  const map = new Map<
    string,
    {
      currencyCode: string;
      accountCount: number;
      eligibleCash: number;
      activeReservations: number;
      remainingCommitments: number;
    }
  >();
  for (const x of rows)
    map.set(String(x.currency_code), {
      currencyCode: String(x.currency_code),
      accountCount: Number(x.account_count),
      eligibleCash: Number(x.eligible_cash),
      activeReservations: Number(x.reserved),
      remainingCommitments: 0,
    });
  for (const x of engagements) {
    const currency = String(x.currency_code),
      current = map.get(currency) ?? {
        currencyCode: currency,
        accountCount: 0,
        eligibleCash: 0,
        activeReservations: 0,
        remainingCommitments: 0,
      };
    current.remainingCommitments = Number(x.remaining);
    map.set(currency, current);
  }
  return [...map.values()]
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode))
    .map((x) => ({
      ...x,
      unallocatedCash: x.eligibleCash - x.activeReservations,
      reservationCovered: Math.min(
        x.remainingCommitments,
        x.activeReservations,
      ),
      unreservedCommitments: Math.max(
        0,
        x.remainingCommitments - x.activeReservations,
      ),
      indicativeShortfall: Math.max(0, x.remainingCommitments - x.eligibleCash),
    }));
}
export async function budgetIndicators(r: Request) {
  const s = await permissionScope(r, "treasury.coverage.view"),
    p = budgetScope(r, s),
    rows = await query<RowDataPacket[]>(
      `SELECT b.id,b.label,b.scope_type,b.agency_id,b.concession_id,b.start_date,b.end_date,co.currency_code,b.initial_amount,COALESCE(f.allocations,0) additional_allocations,b.initial_amount+COALESCE(f.allocations,0) total_envelope,COALESCE(e.committed,0) committed,COALESCE(e.disbursed,0) disbursed,GREATEST(0,COALESCE(e.committed,0)-COALESCE(e.disbursed,0)) remaining_to_pay,GREATEST(0,b.initial_amount+COALESCE(f.allocations,0)-COALESCE(e.committed,0)) available_for_commitments FROM budgets b LEFT JOIN agencies ba ON ba.id=b.agency_id JOIN concessions co ON co.id=COALESCE(b.concession_id,ba.concession_id) LEFT JOIN(SELECT budget_id,SUM(amount) allocations FROM budget_fund_movements GROUP BY budget_id)f ON f.budget_id=b.id LEFT JOIN(SELECT x.budget_id,SUM(x.amount) committed,SUM((${disbursedSql.replaceAll("e.id", "x.id")})) disbursed FROM budget_expenses x WHERE x.approval_status='approved' GROUP BY x.budget_id)e ON e.budget_id=b.id WHERE b.status='active' AND ${p.sql} ORDER BY b.start_date DESC,b.id DESC`,
      p.params,
    );
  return rows.map((x) => ({
    ...x,
    id: String(x.id),
    initial_amount: Number(x.initial_amount),
    additional_allocations: Number(x.additional_allocations),
    total_envelope: Number(x.total_envelope),
    committed: Number(x.committed),
    disbursed: Number(x.disbursed),
    remaining_to_pay: Number(x.remaining_to_pay),
    available_for_commitments: Number(x.available_for_commitments),
  }));
}
export async function listReservations(r: Request) {
  const s = await permissionScope(r, "treasury.reservation.view"),
    p = accountScope(r, s),
    rows = await query<RowDataPacket[]>(
      `SELECT tr.*,ta.name account_name,e.label expense_label,CONCAT_WS(' ',u.first_name,u.last_name) author_name FROM treasury_reservations tr JOIN treasury_accounts ta ON ta.id=tr.account_id JOIN budget_expenses e ON e.id=tr.budget_expense_id LEFT JOIN users u ON u.id=tr.created_by WHERE ${p.sql} ORDER BY tr.created_at DESC,tr.id DESC`,
      p.params,
    );
  return rows.map((x) => ({
    ...x,
    id: String(x.id),
    account_id: String(x.account_id),
    budget_expense_id: String(x.budget_expense_id),
    initial_amount: Number(x.initial_amount),
    active_amount: Number(x.active_amount),
  }));
}
async function expenseAvailable(
  c: PoolConnection,
  expenseId: string,
  exclude?: string,
) {
  const [payable] = await c.execute<RowDataPacket[]>(
      `SELECT GREATEST(0,e.amount-(${disbursedSql})) payable FROM budget_expenses e WHERE e.id=?`,
      [expenseId],
    ),
    [reserved] = await c.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(active_amount),0) reserved FROM treasury_reservations WHERE budget_expense_id=? AND status='ACTIVE'${exclude ? " AND id<>?" : ""}`,
      exclude ? [expenseId, exclude] : [expenseId],
    );
  return Number(payable[0]?.payable ?? 0) - Number(reserved[0]?.reserved ?? 0);
}
async function accountAvailable(
  c: PoolConnection,
  accountId: string,
  exclude?: string,
) {
  const [balances] = await c.execute<RowDataPacket[]>(
      `SELECT ${balanceSql} balance FROM treasury_accounts ta LEFT JOIN treasury_movements tm ON tm.account_id=ta.id WHERE ta.id=? GROUP BY ta.id`,
      [accountId],
    ),
    [reserved] = await c.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(active_amount),0) reserved FROM treasury_reservations WHERE account_id=? AND status='ACTIVE'${exclude ? " AND id<>?" : ""}`,
      exclude ? [accountId, exclude] : [accountId],
    );
  return Number(balances[0]?.balance ?? 0) - Number(reserved[0]?.reserved ?? 0);
}
export async function createReservation(r: Request, b: any) {
  const s = await permissionScope(r, "treasury.reservation.create"),
    p = accountScope(r, s),
    sum = amount(b?.amount),
    clientRequestId = requestId(b?.clientRequestId),
    why = reason(b?.reason),
    expenseId = id(b?.budgetExpenseId),
    accountId = id(b?.accountId),beneficiary=shortText(b?.beneficiary,'Bénéficiaire'),due=dueDate(b?.dueDate);
  const result=await transaction(async (c) => {
    const [expenses] = await c.execute<RowDataPacket[]>(
        `SELECT e.*,b.scope_type,b.agency_id,COALESCE(b.concession_id,ba.concession_id) target_concession_id,co.currency_code FROM budget_expenses e JOIN budgets b ON b.id=e.budget_id LEFT JOIN agencies ba ON ba.id=b.agency_id JOIN concessions co ON co.id=COALESCE(b.concession_id,ba.concession_id) WHERE e.id=? FOR UPDATE`,
        [expenseId],
      ),
      expense = expenses[0];
    if (!expense) throw new HttpError(404, "Dépense introuvable");
    if (expense.approval_status !== "approved")
      throw new HttpError(
        409,
        "Seule une dépense approuvée peut être réservée",
      );
    const [accounts] = await c.execute<RowDataPacket[]>(
        `SELECT ta.* FROM treasury_accounts ta WHERE ta.id=? AND ${p.sql} FOR UPDATE`,
        [accountId, ...p.params],
      ),
      account = accounts[0];
    if (
      !account ||
      !account.is_active ||
      !account.attachment_type ||
      !["CASH", "BANK"].includes(String(account.account_type))
    )
      throw new HttpError(409, "Compte actif et éligible requis");
    if (
      String(account.concession_id) !== String(expense.target_concession_id) ||
      (expense.scope_type === "agency" &&
        !(
          (account.attachment_type === "AGENCY" && String(account.agency_id) === String(expense.agency_id)) ||
          account.attachment_type === "CONCESSION"
        ))
    )
      throw new HttpError(
        409,
        "Compte incompatible avec le périmètre de la dépense",
      );
    if (String(account.currency_code) !== String(expense.currency_code))
      throw new HttpError(409, "Devise incompatible");
    const expenseRemaining = await expenseAvailable(c, expenseId);
    if (sum > expenseRemaining)
      throw new HttpError(409, `Montant supérieur au reste réservable (${expenseRemaining.toFixed(2)} ${expense.currency_code})`);
    const cashAvailable = await accountAvailable(c, accountId);
    if (sum > cashAvailable)
      throw new HttpError(409, `Liquidités librement disponibles insuffisantes (${cashAvailable.toFixed(2)} ${account.currency_code})`);
    const [existing] = await c.execute<RowDataPacket[]>(
      "SELECT * FROM treasury_reservations WHERE created_by=? AND client_request_id=? FOR UPDATE",
      [r.user!.sub, clientRequestId],
    );
    if (existing[0]) {
      if (
        String(existing[0].account_id) !== accountId ||
        String(existing[0].budget_expense_id) !== expenseId ||
        Number(existing[0].initial_amount) !== sum
      )
        throw new HttpError(
          409,
          "Identifiant de requête déjà utilisé avec un contenu différent",
        );
      return { id: String(existing[0].id), duplicate: true };
    }
    const [created] = await c.execute<ResultSetHeader>(
        "INSERT INTO treasury_reservations(account_id,budget_expense_id,agency_id,concession_id,currency_code,reference,initial_amount,active_amount,reason,beneficiary,due_date,status,client_request_id,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,'DRAFT',?,?)",
        [
          accountId,
          expenseId,
          account.agency_id,
          account.concession_id,
          account.currency_code,
          b?.reference == null
            ? null
            : String(b.reference).trim().slice(0, 150),
          sum,
          0,
          why,
          beneficiary,
          due,
          clientRequestId,
          r.user!.sub,
        ],
      ),
      reservationId = String(created.insertId);
    await c.execute(
      "INSERT INTO treasury_reservation_events(reservation_id,event_type,amount,amount_before,amount_after,reason,created_by) VALUES(?,'CREATED',?,0,?,?,?)",
      [reservationId, sum, 0, why, r.user!.sub],
    );
    await writeAudit(c, r, {
      module: "treasury",
      entityType: "treasury_reservation",
      entityId: reservationId,
      action: "treasury.reservation.created",
      newValues: {
        accountId,
        expenseId,
        amount: sum,
        currencyCode: account.currency_code,
      },
    });
    return { id: reservationId, duplicate: false };
  });
  if(!result.duplicate)await publishReservation(result.id,'created');
  return result;
}

async function publishReservation(reservationId:string,action:string){const rows=await query<RowDataPacket[]>(`SELECT ta.concession_id FROM treasury_reservations tr JOIN treasury_accounts ta ON ta.id=tr.account_id WHERE tr.id=?`,[reservationId]);if(!rows[0])return;const agencyRows=await query<RowDataPacket[]>('SELECT id FROM agencies WHERE concession_id=?',[rows[0].concession_id]);emitToDomainAgenciesAndGlobals('treasury',agencyRows.map(x=>String(x.id)),'treasury:reservation-updated',{id:reservationId,action})}

async function lockedReservation(c:PoolConnection,r:Request,permission:RP,value:unknown){const s=await permissionScope(r,permission),p=accountScope(r,s),reservationId=id(value),[rows]=await c.execute<RowDataPacket[]>(`SELECT tr.* FROM treasury_reservations tr JOIN treasury_accounts ta ON ta.id=tr.account_id WHERE tr.id=? AND ${p.sql} FOR UPDATE`,[reservationId,...p.params]);if(!rows[0])throw new HttpError(404,'Réservation introuvable');return rows[0]}
async function reservationEvent(c:PoolConnection,r:Request,row:RowDataPacket,event:string,why:string,before=Number(row.active_amount),after=before){await c.execute('INSERT INTO treasury_reservation_events(reservation_id,event_type,amount,amount_before,amount_after,reason,created_by) VALUES(?,?,?,?,?,?,?)',[row.id,event,Math.abs(after-before),before,after,why,r.user!.sub])}
export async function submitReservation(r:Request,value:unknown){const result=await transaction(async c=>{const row=await lockedReservation(c,r,'treasury.reservation.submit',value);if(!['DRAFT','REJECTED'].includes(String(row.status)))throw new HttpError(409,'Seule une demande brouillon ou rejetée peut être soumise');await c.execute("UPDATE treasury_reservations SET status='SUBMITTED',submitted_by=?,submitted_at=NOW(),decided_by=NULL,decided_at=NULL,decision_reason=NULL WHERE id=?",[r.user!.sub,row.id]);await reservationEvent(c,r,row,'SUBMITTED','Demande soumise');await writeAudit(c,r,{module:'treasury',entityType:'treasury_reservation',entityId:String(row.id),action:'treasury.reservation.submitted'});return{id:String(row.id),status:'SUBMITTED'}});await publishReservation(result.id,'submitted');return result}
export async function approveReservation(r:Request,value:unknown){const result=await transaction(async c=>{const row=await lockedReservation(c,r,'treasury.reservation.approve',value);if(row.status!=='SUBMITTED')throw new HttpError(409,'Seule une réservation soumise peut être approuvée');if(String(row.created_by)===String(r.user!.sub))throw new HttpError(409,'Le demandeur ne peut pas approuver sa propre réservation');const sum=Number(row.initial_amount);if(sum>await expenseAvailable(c,String(row.budget_expense_id),String(row.id)))throw new HttpError(409,'Reste à payer non réservé insuffisant');if(sum>await accountAvailable(c,String(row.account_id),String(row.id)))throw new HttpError(409,'Liquidité non réservée insuffisante');await c.execute("UPDATE treasury_reservations SET status='ACTIVE',active_amount=initial_amount,decided_by=?,decided_at=NOW(),decision_reason=NULL WHERE id=?",[r.user!.sub,row.id]);await reservationEvent(c,r,row,'APPROVED','Demande approuvée',0,sum);await writeAudit(c,r,{module:'treasury',entityType:'treasury_reservation',entityId:String(row.id),action:'treasury.reservation.approved',newValues:{amount:sum}});return{id:String(row.id),status:'ACTIVE',activeAmount:sum}});await publishReservation(result.id,'approved');return result}
export async function rejectReservation(r:Request,value:unknown,b:any){const why=reason(b?.reason);const result=await transaction(async c=>{const row=await lockedReservation(c,r,'treasury.reservation.approve',value);if(row.status!=='SUBMITTED')throw new HttpError(409,'Seule une réservation soumise peut être rejetée');if(String(row.created_by)===String(r.user!.sub))throw new HttpError(409,'Le demandeur ne peut pas rejeter sa propre réservation');await c.execute("UPDATE treasury_reservations SET status='REJECTED',decided_by=?,decided_at=NOW(),decision_reason=? WHERE id=?",[r.user!.sub,why,row.id]);await reservationEvent(c,r,row,'REJECTED',why);await writeAudit(c,r,{module:'treasury',entityType:'treasury_reservation',entityId:String(row.id),action:'treasury.reservation.rejected',newValues:{reason:why}});return{id:String(row.id),status:'REJECTED'}});await publishReservation(result.id,'rejected');return result}
export async function cancelReservation(r:Request,value:unknown,b:any){const why=reason(b?.reason);return transaction(async c=>{const row=await lockedReservation(c,r,'treasury.reservation.cancel',value);if(!['DRAFT','SUBMITTED','REJECTED'].includes(String(row.status)))throw new HttpError(409,'Une réservation active doit être libérée');await c.execute("UPDATE treasury_reservations SET status='CANCELLED',active_amount=0,decision_reason=? WHERE id=?",[why,row.id]);await reservationEvent(c,r,row,'CANCELLED',why);await writeAudit(c,r,{module:'treasury',entityType:'treasury_reservation',entityId:String(row.id),action:'treasury.reservation.cancelled',newValues:{reason:why}});return{id:String(row.id),status:'CANCELLED'}})}
export async function expireReservation(r:Request,value:unknown,b:any){const why=reason(b?.reason);return transaction(async c=>{const row=await lockedReservation(c,r,'treasury.reservation.expire',value);if(row.status!=='ACTIVE'||Number(row.active_amount)<=0)throw new HttpError(409,'Seule une réservation active peut expirer');const before=Number(row.active_amount);await c.execute("UPDATE treasury_reservations SET status='EXPIRED',active_amount=0 WHERE id=?",[row.id]);await reservationEvent(c,r,row,'EXPIRED',why,before,0);await writeAudit(c,r,{module:'treasury',entityType:'treasury_reservation',entityId:String(row.id),action:'treasury.reservation.expired',newValues:{released:before,reason:why}});return{id:String(row.id),status:'EXPIRED'}})}
export async function eligibleExpenses(r:Request,accountValue?:unknown){const s=await permissionScope(r,'treasury.reservation.create'),p=budgetScope(r,s),accountId=accountValue==null||accountValue===''?null:id(accountValue);let account:RowDataPacket|undefined;if(accountId){const ap=accountScope(r,s),found=await query<RowDataPacket[]>(`SELECT ta.* FROM treasury_accounts ta WHERE ta.id=? AND ta.is_active=TRUE AND ta.account_type IN('CASH','BANK') AND ${ap.sql}`,[accountId,...ap.params]);account=found[0];if(!account)throw new HttpError(404,'Compte actif introuvable dans votre périmètre');if(!account.attachment_type)throw new HttpError(409,'Rattachement historique du compte à qualifier avant réservation')}const compatibility=account?" AND c.id=? AND c.currency_code=? AND (b.scope_type<>'agency' OR ?='CONCESSION' OR (?='AGENCY' AND b.agency_id=?))":"",compatibilityParams=account?[account.concession_id,account.currency_code,account.attachment_type,account.attachment_type,account.agency_id]:[],rows=await query<RowDataPacket[]>(`SELECT e.id,e.label,e.reference,e.amount,b.id budget_id,b.label budget_label,b.scope_type,b.agency_id,COALESCE(b.concession_id,ba.concession_id) concession_id,COALESCE(a.name,c.name) territory_name,c.currency_code,GREATEST(0,e.amount-(${disbursedSql})-COALESCE((SELECT SUM(tr.active_amount) FROM treasury_reservations tr WHERE tr.budget_expense_id=e.id AND tr.status='ACTIVE'),0)) available_amount FROM budget_expenses e JOIN budgets b ON b.id=e.budget_id LEFT JOIN agencies ba ON ba.id=b.agency_id LEFT JOIN agencies a ON a.id=b.agency_id JOIN concessions c ON c.id=COALESCE(b.concession_id,ba.concession_id) WHERE e.approval_status='approved' AND ${p.sql}${compatibility} HAVING available_amount>0 ORDER BY e.expense_date DESC,e.id DESC`,[...p.params,...compatibilityParams]);return rows.map(x=>({...x,id:String(x.id),budget_id:String(x.budget_id),agency_id:x.agency_id==null?null:String(x.agency_id),concession_id:String(x.concession_id),amount:Number(x.amount),available_amount:Number(x.available_amount)}))}
export async function adjustReservation(r: Request, value: unknown, b: any) {
  const s = await permissionScope(r, "treasury.reservation.adjust"),
    p = accountScope(r, s),
    reservationId = id(value),
    next = amount(b?.amount),
    why = reason(b?.reason);
  return transaction(async (c) => {
    const [rows] = await c.execute<RowDataPacket[]>(
        `SELECT tr.* FROM treasury_reservations tr JOIN treasury_accounts ta ON ta.id=tr.account_id WHERE tr.id=? AND ${p.sql} FOR UPDATE`,
        [reservationId, ...p.params],
      ),
      current = rows[0];
    if (!current) throw new HttpError(404, "Réservation introuvable");
    if (current.status !== "ACTIVE")
      throw new HttpError(409, "La réservation n’est plus active");
    if (next > Number(current.active_amount))
      throw new HttpError(
        409,
        "Une augmentation doit faire l’objet d’une nouvelle demande approuvée",
      );
    if (
      next >
      (await expenseAvailable(
        c,
        String(current.budget_expense_id),
        reservationId,
      ))
    )
      throw new HttpError(409, "Montant supérieur au reste à payer disponible");
    if (
      next >
      (await accountAvailable(c, String(current.account_id), reservationId))
    )
      throw new HttpError(409, "Montant supérieur à la trésorerie disponible");
    const before = Number(current.active_amount);
    await c.execute(
      "UPDATE treasury_reservations SET active_amount=? WHERE id=?",
      [next, reservationId],
    );
    await c.execute(
      "INSERT INTO treasury_reservation_events(reservation_id,event_type,amount,amount_before,amount_after,reason,created_by) VALUES(?,'ADJUSTED',?,?,?,?,?)",
      [reservationId, Math.abs(next - before), before, next, why, r.user!.sub],
    );
    await writeAudit(c, r, {
      module: "treasury",
      entityType: "treasury_reservation",
      entityId: reservationId,
      action: "treasury.reservation.adjusted",
      oldValues: { amount: before },
      newValues: { amount: next, reason: why },
    });
    return { id: reservationId, status: "ACTIVE", activeAmount: next };
  });
}
export async function releaseReservation(r: Request, value: unknown, b: any) {
  const s = await permissionScope(r, "treasury.reservation.release"),
    p = accountScope(r, s),
    reservationId = id(value),
    why = reason(b?.reason);
  return transaction(async (c) => {
    const [rows] = await c.execute<RowDataPacket[]>(
        `SELECT tr.* FROM treasury_reservations tr JOIN treasury_accounts ta ON ta.id=tr.account_id WHERE tr.id=? AND ${p.sql} FOR UPDATE`,
        [reservationId, ...p.params],
      ),
      current = rows[0];
    if (!current) throw new HttpError(404, "Réservation introuvable");
    if (current.status !== "ACTIVE" || Number(current.active_amount) <= 0)
      throw new HttpError(409, "La réservation n’est plus active");
    const before = Number(current.active_amount);
    await c.execute(
      "UPDATE treasury_reservations SET active_amount=0,status='RELEASED' WHERE id=?",
      [reservationId],
    );
    await c.execute(
      "INSERT INTO treasury_reservation_events(reservation_id,event_type,amount,amount_before,amount_after,reason,created_by) VALUES(?,'RELEASED',?,?,0,?,?)",
      [reservationId, before, before, why, r.user!.sub],
    );
    await writeAudit(c, r, {
      module: "treasury",
      entityType: "treasury_reservation",
      entityId: reservationId,
      action: "treasury.reservation.released",
      newValues: { amount: before, reason: why },
    });
    return { id: reservationId, status: "RELEASED" };
  });
}
export async function reservationHistory(r: Request, value: unknown) {
  const s = await permissionScope(r, "treasury.reservation.view"),
    p = accountScope(r, s),
    reservationId = id(value),
    rows = await query<RowDataPacket[]>(
      `SELECT ev.*,CONCAT_WS(' ',u.first_name,u.last_name) actor_name FROM treasury_reservation_events ev JOIN treasury_reservations tr ON tr.id=ev.reservation_id JOIN treasury_accounts ta ON ta.id=tr.account_id LEFT JOIN users u ON u.id=ev.created_by WHERE tr.id=? AND ${p.sql} ORDER BY ev.created_at,ev.id`,
      [reservationId, ...p.params],
    );
  return rows.map((x) => ({
    ...x,
    id: String(x.id),
    amount: Number(x.amount),
    amount_before: Number(x.amount_before),
    amount_after: Number(x.amount_after),
  }));
}
export async function consumeReservation(
  c: PoolConnection,
  r: Request,
  value: unknown,
  expenseId: string,
  accountId: string,
  disbursementId: string,
  sum: number,
) {
  if (value == null || value === "") return;
  const reservationId = id(value),
    [rows] = await c.execute<RowDataPacket[]>(
      "SELECT * FROM treasury_reservations WHERE id=? AND budget_expense_id=? AND account_id=? FOR UPDATE",
      [reservationId, expenseId, accountId],
    ),
    current = rows[0];
  if (!current || current.status !== "ACTIVE")
    throw new HttpError(409, "Réservation active compatible introuvable");
  const before = Number(current.active_amount);
  if (sum > before)
    throw new HttpError(409, "Décaissement supérieur au montant réservé");
  const after = before - sum,
    status = after === 0 ? "CONSUMED" : "ACTIVE";
  await c.execute(
    "UPDATE treasury_reservations SET active_amount=?,status=? WHERE id=?",
    [after, status, reservationId],
  );
  await c.execute(
    "INSERT INTO treasury_reservation_events(reservation_id,event_type,amount,amount_before,amount_after,reason,budget_expense_disbursement_id,created_by) VALUES(?,'CONSUMED',?,?,?,?,?,?)",
    [
      reservationId,
      sum,
      before,
      after,
      "Décaissement budgétaire lié",
      disbursementId,
      r.user!.sub,
    ],
  );
  await writeAudit(c, r, {
    module: "treasury",
    entityType: "treasury_reservation",
    entityId: reservationId,
    action: "treasury.reservation.consumed",
    oldValues: { amount: before },
    newValues: { amount: after, disbursementId },
  });
}
