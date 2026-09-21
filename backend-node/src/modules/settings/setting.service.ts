import type { Request } from "express";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { query, transaction } from "../../config/database.js";
import { HttpError } from "../../shared/http-error.js";
import {
  emitToAgenciesAndGlobals,
  emitToAgencyAndGlobals,
} from "../../realtime/socket.js";
import {
  getBusinessIdentity,
  getEffectiveBusinessSettings,
} from "./setting-resolver.js";
import {
  SETTING_KEYS,
  type AgencyPayload,
  type ConcessionIdentityPayload,
  type UpdateSettingsPayload,
} from "./setting.types.js";
const id = (v: unknown) => {
    const x = String(v ?? "");
    if (!/^[1-9]\d*$/.test(x)) throw new HttpError(400, "Identifiant invalide");
    return x;
  },
  text = (v: unknown, label: string, required = false, max = 255) => {
    const x = typeof v === "string" ? v.trim() : "";
    if (required && !x) throw new HttpError(400, `${label} obligatoire`);
    if (x.length > max) throw new HttpError(400, `${label} trop long`);
    return x || null;
  },
  number = (v: unknown, label: string, max = Number.MAX_SAFE_INTEGER) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max)
      throw new HttpError(400, `${label} invalide`);
    return v;
  };
async function audit(
  c: PoolConnection,
  r: Request,
  type: string,
  entityId: string,
  action: string,
  oldValues: unknown,
  newValues: unknown,
) {
  await c.execute(
    "INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,old_values,new_values,ip_address,user_agent) VALUES(?,?,?,?,?,?,?,?,?)",
    [
      r.user!.sub,
      "settings",
      type,
      entityId,
      action,
      JSON.stringify(oldValues),
      JSON.stringify(newValues),
      r.ip ?? null,
      r.get("user-agent") ?? null,
    ],
  );
}
async function currentConcessionId(r: Request) {
  const [row] = await query<RowDataPacket[]>(
    "SELECT concession_id FROM agencies WHERE id=?",
    [r.user!.agencyId],
  );
  if (!row) throw new HttpError(400, "Agence de rattachement invalide");
  return String(row.concession_id);
}
function settingsScope(
  r: Request,
  permission: "settings.view" | "settings.update",
) {
  return r.rbac?.isSuperAdmin ? "GLOBAL" : r.rbac?.permissions.get(permission);
}
function assertCollectiveRead(r: Request) {
  const scope = settingsScope(r, "settings.view");
  if (scope === "OWN" || scope == null)
    throw new HttpError(
      403,
      "Le scope OWN ne permet pas de consulter les paramètres collectifs",
    );
  return scope;
}
function assertConcessionWrite(r: Request) {
  const scope = settingsScope(r, "settings.update");
  if (scope !== "CONCESSION" && scope !== "GLOBAL")
    throw new HttpError(
      403,
      "La modification des paramètres concession exige un scope CONCESSION ou GLOBAL",
    );
  return scope;
}
async function emitConcessionSettings(concessionId: string) {
  const agencies = await query<RowDataPacket[]>(
    "SELECT id FROM agencies WHERE concession_id=?",
    [concessionId],
  );
  emitToAgenciesAndGlobals(
    agencies.map((x) => String(x.id)),
    "settings:updated",
    { concessionId },
  );
}
async function manageableAgency(agencyId: string, r: Request) {
  const [row] = await query<RowDataPacket[]>(
    "SELECT id,concession_id FROM agencies WHERE id=?",
    [agencyId],
  );
  if (!row) throw new HttpError(404, "Agence introuvable");
  const scope = r.rbac?.isSuperAdmin
    ? "GLOBAL"
    : r.rbac?.permissions.get("settings.update");
  if (scope === "GLOBAL") return row;
  if (
    scope === "CONCESSION" &&
    String(row.concession_id) === (await currentConcessionId(r))
  )
    return row;
  if (scope === "AGENCY" && String(row.id) === String(r.user!.agencyId))
    return row;
  throw new HttpError(403, "Agence hors du scope settings.update");
}
export async function get(r: Request, enforceRead = true) {
  if (enforceRead) assertCollectiveRead(r);
  const concessionId = await currentConcessionId(r),
    [c] = await query<RowDataPacket[]>("SELECT * FROM concessions WHERE id=?", [
      concessionId,
    ]);
  if (!c) throw new HttpError(404, "Concession introuvable");
  const settings = await getEffectiveBusinessSettings(r.user!.agencyId!);
  return {
    concession: {
      id: String(c.id),
      name: c.name,
      legalName: c.legal_name,
      taxIdentifier: c.tax_identifier,
      address: c.address,
      city: c.city,
      country: c.country,
      currencyCode: c.currency_code,
      timezone: c.timezone,
    },
    billing: { defaultVatRate: settings.vatRate },
    workshop: { rates: settings.rates },
  };
}
export function validateSettings(body: unknown): UpdateSettingsPayload {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new HttpError(400, "Configuration invalide");
  const b = body as Partial<UpdateSettingsPayload>,
    vat = number(b.billing?.defaultVatRate, "TVA", 100),
    rates = b.workshop?.rates;
  return {
    billing: { defaultVatRate: vat },
    ...(rates?{workshop: {
      rates: {
        T1: number(rates.T1, "Tarif T1"),
        T2: number(rates.T2, "Tarif T2"),
        T3: number(rates.T3, "Tarif T3"),
        T4: number(rates.T4, "Tarif T4"),
      },
    }}:{}),
  };
}
export async function update(body: unknown, r: Request) {
  assertConcessionWrite(r);
  const value = validateSettings(body),
    concessionId = await currentConcessionId(r),
    entries = [
      [SETTING_KEYS.vat, value.billing.defaultVatRate],
      ...(value.workshop?[
        [SETTING_KEYS.T1, value.workshop.rates.T1],
        [SETTING_KEYS.T2, value.workshop.rates.T2],
        [SETTING_KEYS.T3, value.workshop.rates.T3],
        [SETTING_KEYS.T4, value.workshop.rates.T4],
      ] as const:[]),
    ] as const;
  await transaction(async (c) => {
    const [old] = await c.execute<RowDataPacket[]>(
      `SELECT setting_key,setting_value FROM settings WHERE scope_type='concession' AND scope_id=? AND setting_key IN (${entries.map(()=>'?').join(',')})`,
      [concessionId, ...entries.map((x) => x[0])],
    );
    for (const [key, v] of entries)
      await c.execute(
        `INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description,updated_by) VALUES('concession',?,?,?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_by=VALUES(updated_by)`,
        [concessionId, key, JSON.stringify(v), key, r.user!.sub],
      );
    await audit(
      c,
      r,
      "concession",
      concessionId,
      "settings.updated",
      Object.fromEntries(old.map((x) => [x.setting_key, x.setting_value])),
      Object.fromEntries(entries),
    );
  });
  await emitConcessionSettings(concessionId);
  return get(r, false);
}
export async function currentConcession(r: Request, enforceRead = true) {
  if (enforceRead) assertCollectiveRead(r);
  return getBusinessIdentity(r.user!.agencyId!);
}
export function validateConcession(body: unknown): ConcessionIdentityPayload {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new HttpError(400, "Identité concession invalide");
  const b = (body ?? {}) as Partial<ConcessionIdentityPayload>,
    currency = String(text(b.currencyCode, "Devise", true, 3)).toUpperCase(),
    timezone = text(b.timezone, "Fuseau horaire", true, 80)!;
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, "Devise invalide");
  const supportedCurrencies = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf?.("currency");
  if (supportedCurrencies && !supportedCurrencies.includes(currency))
    throw new HttpError(400, "Devise inconnue");
  try {
    Intl.DateTimeFormat("fr", { timeZone: timezone });
  } catch {
    throw new HttpError(400, "Fuseau horaire invalide");
  }
  return {
    name: text(b.name, "Nom commercial", true, 150)!,
    legalName: text(b.legalName, "Raison sociale", false, 200),
    taxIdentifier: text(b.taxIdentifier, "Identifiant fiscal", false, 100),
    address: text(b.address, "Adresse", false, 500),
    city: text(b.city, "Ville", false, 100),
    country: text(b.country, "Pays", false, 100),
    currencyCode: currency,
    timezone,
  };
}
export async function updateConcession(body: unknown, r: Request) {
  assertConcessionWrite(r);
  const v = validateConcession(body),
    concessionId = await currentConcessionId(r);
  await transaction(async (c) => {
    const [old] = await c.execute<RowDataPacket[]>(
      "SELECT * FROM concessions WHERE id=? FOR UPDATE",
      [concessionId],
    );
    await c.execute(
      "UPDATE concessions SET name=?,legal_name=?,tax_identifier=?,address=?,city=?,country=?,currency_code=?,timezone=? WHERE id=?",
      [
        v.name,
        v.legalName ?? null,
        v.taxIdentifier ?? null,
        v.address ?? null,
        v.city ?? null,
        v.country ?? null,
        v.currencyCode,
        v.timezone,
        concessionId,
      ],
    );
    await audit(
      c,
      r,
      "concession",
      concessionId,
      "concession.updated",
      old[0],
      v,
    );
  });
  await emitConcessionSettings(concessionId);
  return currentConcession(r, false);
}
export async function updateDocumentLogo(body:unknown,r:Request){
  assertConcessionWrite(r);const value=String((body as {dataUrl?:unknown})?.dataUrl??''),match=/^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if(!match)throw new HttpError(400,'Logo invalide : PNG ou JPEG requis');const mime=match[1]!,buffer=Buffer.from(match[2]!,'base64');
  if(!buffer.length||buffer.length>2*1024*1024)throw new HttpError(400,'Logo invalide ou supérieur à 2 Mo');
  const png=buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpeg=buffer.length>=3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255;
  if((mime==='image/png'&&!png)||(mime==='image/jpeg'&&!jpeg))throw new HttpError(400,'Le contenu du logo ne correspond pas au format déclaré');
  const concessionId=await currentConcessionId(r);await transaction(async c=>{await c.execute('UPDATE concessions SET document_logo=?,document_logo_mime=? WHERE id=?',[buffer,mime,concessionId]);await audit(c,r,'concession',concessionId,'document_logo.updated',null,{mime,size:buffer.length})});return currentConcession(r,false);
}
export async function deleteDocumentLogo(r:Request){assertConcessionWrite(r);const concessionId=await currentConcessionId(r);await transaction(async c=>{await c.execute('UPDATE concessions SET document_logo=NULL,document_logo_mime=NULL WHERE id=?',[concessionId]);await audit(c,r,'concession',concessionId,'document_logo.deleted',null,{})});return currentConcession(r,false)}
export async function agencies(r: Request) {
  const scope = r.rbac?.isSuperAdmin
      ? "GLOBAL"
      : r.rbac?.permissions.get("settings.view"),
    concessionId = await currentConcessionId(r),
    rows = await query<RowDataPacket[]>(
      `SELECT a.id,a.concession_id,a.name,a.code,a.address,a.city,a.phone,a.email,a.is_active FROM agencies a WHERE (?='GLOBAL' OR (?='CONCESSION' AND a.concession_id=?) OR a.id=?) ORDER BY a.name`,
      [scope, scope, concessionId, r.user!.agencyId],
    );
  return rows.map((x) => ({
    id: String(x.id),
    concessionId: String(x.concession_id),
    name: x.name,
    code: x.code,
    address: x.address,
    city: x.city,
    phone: x.phone,
    email: x.email,
    isActive: Boolean(x.is_active),
  }));
}
export function validateAgency(body: unknown, creating = false): AgencyPayload {
  const b = (body ?? {}) as Partial<AgencyPayload>;
  const email = text(b.email, "Email", false, 150);
  if (email && !/^\S+@\S+\.\S+$/.test(email))
    throw new HttpError(400, "Email agence invalide");
  return {
    name: text(b.name, "Nom agence", creating, 150) ?? "",
    code: String(text(b.code, "Code agence", creating, 50) ?? "").toUpperCase(),
    address: text(b.address, "Adresse", false, 500),
    city: text(b.city, "Ville", false, 100),
    phone: text(b.phone, "Téléphone", false, 50),
    email,
    concessionId: b.concessionId ? id(b.concessionId) : undefined,
  };
}
export async function createAgency(body: unknown, r: Request) {
  const v = validateAgency(body, true),
    ownConcessionId = await currentConcessionId(r),
    scope = r.rbac?.isSuperAdmin
      ? "GLOBAL"
      : r.rbac?.permissions.get("settings.update");
  if (scope !== "GLOBAL" && scope !== "CONCESSION")
    throw new HttpError(
      403,
      "La création d’agence exige un scope CONCESSION ou GLOBAL",
    );
  const concessionId =
    scope === "GLOBAL" && v.concessionId ? v.concessionId : ownConcessionId;
  const agencyId = await transaction(async (c) => {
    const [result] = await c.execute<ResultSetHeader>(
      "INSERT INTO agencies(concession_id,name,code,address,city,phone,email,is_active) VALUES(?,?,?,?,?,?,?,TRUE)",
      [
        concessionId,
        v.name,
        v.code,
        v.address ?? null,
        v.city ?? null,
        v.phone ?? null,
        v.email ?? null,
      ],
    );
    await audit(
      c,
      r,
      "agency",
      String(result.insertId),
      "agency.created",
      null,
      v,
    );
    return String(result.insertId);
  });
  emitToAgencyAndGlobals(r.user!.agencyId!, "agencies:updated", { agencyId });
  return { agencyId };
}
export async function updateAgency(
  agencyId: string,
  body: unknown,
  r: Request,
) {
  const v = validateAgency(body);
  await manageableAgency(agencyId, r);
  await transaction(async (c) => {
    const [old] = await c.execute<RowDataPacket[]>(
      "SELECT * FROM agencies WHERE id=? FOR UPDATE",
      [agencyId],
    );
    if (!old[0]) throw new HttpError(404, "Agence introuvable");
    await c.execute(
      "UPDATE agencies SET name=COALESCE(?,name),code=COALESCE(NULLIF(?,''),code),address=?,city=?,phone=?,email=? WHERE id=?",
      [
        v.name || null,
        v.code,
        v.address ?? null,
        v.city ?? null,
        v.phone ?? null,
        v.email ?? null,
        agencyId,
      ],
    );
    await audit(c, r, "agency", agencyId, "agency.updated", old[0], v);
  });
  emitToAgencyAndGlobals(r.user!.agencyId!, "agencies:updated", { agencyId });
  return { agencyId };
}
export async function agencyStatus(
  agencyId: string,
  value: unknown,
  r: Request,
) {
  if (typeof value !== "boolean")
    throw new HttpError(400, "Statut agence invalide");
  await manageableAgency(agencyId, r);
  await transaction(async (c) => {
    const [old] = await c.execute<RowDataPacket[]>(
      "SELECT * FROM agencies WHERE id=? FOR UPDATE",
      [agencyId],
    );
    if (!old[0]) throw new HttpError(404, "Agence introuvable");
    if (!value) {
      const [users] = await c.execute<RowDataPacket[]>(
        "SELECT COUNT(*) total FROM users WHERE agency_id=? AND is_active=TRUE",
        [agencyId],
      );
      if (Number(users[0]?.total) > 0)
        throw new HttpError(
          409,
          `Cette agence possède encore ${users[0]!.total} utilisateurs actifs. Veuillez les transférer ou les désactiver avant de fermer l’agence.`,
        );
      const [active] = await c.execute<RowDataPacket[]>(
        `SELECT (SELECT COUNT(*) FROM repair_orders WHERE agency_id=? AND status NOT IN('closed','cancelled'))+(SELECT COUNT(*) FROM deliveries WHERE agency_id=? AND status NOT IN('delivered','cancelled'))+(SELECT COUNT(*) FROM vehicles WHERE agency_id=? AND status NOT IN('sold','delivered')) total`,
        [agencyId, agencyId, agencyId],
      );
      if (Number(active[0]?.total) > 0)
        throw new HttpError(
          409,
          `Cette agence possède encore ${active[0]!.total} opérations actives.`,
        );
    }
    await c.execute("UPDATE agencies SET is_active=? WHERE id=?", [
      value,
      agencyId,
    ]);
    await audit(
      c,
      r,
      "agency",
      agencyId,
      value ? "agency.reactivated" : "agency.disabled",
      { isActive: Boolean(old[0].is_active) },
      { isActive: value },
    );
  });
  emitToAgencyAndGlobals(r.user!.agencyId!, "agencies:updated", {
    agencyId,
    isActive: value,
  });
  return { agencyId, isActive: value };
}
