import { Router } from 'express';
import { execute, query, transaction } from '../../config/database.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { emitToAgency } from '../../realtime/socket.js';
import { HttpError } from '../../shared/http-error.js';
import { notifyPermissions } from '../notifications/notification.service.js';
import { renderVehicleDocumentData } from '../documents/commercial-document.js';
import { can } from '../rbac/rbac.service.js';
import { deleteVehicleImageFile, finalizeVehicleImages, withStagedVehicleImages } from './vehicle-image-storage.js';
import { permissionScopePredicate } from '../rbac/scope-intersection.js';
export const vehicleRouter = Router();
const DB_STATUSES = ['ordered', 'in_transit', 'received', 'preparation', 'available', 'reserved', 'sold', 'delivered'];
export const ADMINISTRABLE_VEHICLE_STATUSES = ['ordered', 'in_transit', 'received', 'preparation', 'available'];
export const COMMERCIAL_PARK_STATUSES = ['received', 'preparation', 'available', 'reserved'];
const ACTIVE_TYPES = ['new', 'used'];
export const VEHICLE_FINANCIAL_FIELDS = ['purchasePrice', 'refurbishmentCost', 'transportCost', 'administrativeCost', 'additionalCosts', 'catalogPrice', 'salePrice', 'minimumPrice'];
const idOf = (value) => { const id = Array.isArray(value) ? value[0] : value; if (!id || !/^[1-9]\d*$/.test(id))
    throw new HttpError(400, 'Identifiant véhicule invalide'); return id; };
const txt = (value, max = 255) => String(value ?? '').trim().slice(0, max);
const optional = (value, max = 255) => { const valueText = txt(value, max); return valueText || null; };
const amount = (value, name) => { const parsed = Number(value ?? 0); if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999999999999999.99)
    throw new HttpError(400, `${name} doit être compris entre 0 et 9 999 999 999 999 999,99`); return Math.round(parsed * 100) / 100; };
const assertCostTotal = (values) => { const total = values.reduce((sum, value) => sum + Number(value ?? 0), 0); if (!Number.isFinite(total) || total > 9999999999999999.99)
    throw new HttpError(400, 'Le coût de revient total dépasse la capacité autorisée'); };
const integer = (value, name, required = false) => { if ((value == null || value === '') && !required)
    return null; const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 0)
    throw new HttpError(400, `${name} doit être un entier positif`); return parsed; };
const hasFinance = (request) => Boolean(request.rbac && can(request.rbac, 'vehicles.financials.view'));
const grant = (request, permission) => request.rbac?.permissions.get(permission) ?? undefined;
export function vehicleScope(request, permission, alias = 'v', requested = request.query.agencyId) { const value = grant(request, permission), agencyId = request.user?.agencyId; if (value === 'GLOBAL')
    return requested ? { sql: `${alias}.agency_id=?`, params: [String(requested)] } : { sql: '1=1', params: [] }; if (!agencyId)
    throw new HttpError(403, 'Aucune agence associée'); if (value === 'CONCESSION')
    return requested ? { sql: `${alias}.agency_id=? AND ${alias}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`, params: [String(requested), agencyId] } : { sql: `${alias}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`, params: [agencyId] }; if (value === 'AGENCY')
    return { sql: `${alias}.agency_id=?`, params: [agencyId] }; if (value === 'OWN')
    throw new HttpError(403, 'Le scope OWN ne s’applique pas au stock véhicules'); throw new HttpError(403, `Scope manquant pour ${permission}`); }
const assertAgencyPermissionScope = async (request, permission, targetAgencyId) => { const scoped = grant(request, permission), current = String(request.user?.agencyId ?? ''); if (scoped === 'OWN')
    throw new HttpError(403, 'Le scope OWN ne s’applique pas au stock véhicules'); if (scoped === 'GLOBAL')
    return; if (scoped === 'AGENCY' && targetAgencyId === current)
    return; if (scoped === 'CONCESSION') {
    const [row] = await query('SELECT id FROM agencies WHERE id=? AND concession_id=(SELECT concession_id FROM agencies WHERE id=?) AND is_active=TRUE', [targetAgencyId, current]);
    if (row)
        return;
} throw new HttpError(403, `Agence hors périmètre pour ${permission}`); };
const agency = async (request, permission, requested) => { const current = request.user?.agencyId, target = String(requested ?? current ?? ''); if (!target)
    throw new HttpError(403, 'Aucune agence associée'); await assertAgencyPermissionScope(request, permission, target); const [row] = await query('SELECT id FROM agencies WHERE id=? AND is_active=TRUE', [target]); if (!row)
    throw new HttpError(400, 'Agence invalide ou inactive'); return target; };
const hasFinancialPayload = (body) => VEHICLE_FINANCIAL_FIELDS.some(field => Object.hasOwn(body, field));
const jsonField = (value, fallback) => { if (value == null || value === '')
    return fallback; if (typeof value !== 'string')
    return value; try {
    return JSON.parse(value);
}
catch {
    throw new HttpError(400, 'Champ JSON invalide');
} };
export function vehicleInventoryViewSql(view) { if (view === 'active')
    return " AND v.status NOT IN('sold','delivered')"; if (view === 'sold')
    return " AND v.status IN('sold','delivered')"; if (view === 'all')
    return ''; throw new HttpError(400, 'Vue de stock invalide'); }
vehicleRouter.use('/vehicles', (request, _response, next) => {
    if (request.method !== 'POST' || request.path !== '/')
        return next();
    const vin = txt(request.body?.vin, 40).toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))
        return next(new HttpError(400, 'Le VIN doit comporter exactement 17 caractères valides.'));
    const initialStatus = txt(request.body?.status) || 'received';
    if (!ADMINISTRABLE_VEHICLE_STATUSES.includes(initialStatus))
        return next(new HttpError(409, 'Le statut initial doit être Commandé, En transit, Réceptionné, En préparation ou Disponible.'));
    request.body.vin = vin;
    next();
});
const locationScope = (request, permission, alias = 'vl', requested = request.query.agencyId) => vehicleScope(request, permission, alias, requested);
const locationDto = (row) => ({ id: String(row.id), agencyId: String(row.agency_id), agencyName: row.agency_name, name: String(row.name), type: String(row.type), isActive: Boolean(row.is_active), createdAt: row.created_at, updatedAt: row.updated_at });
vehicleRouter.get('/vehicle-locations', requirePermission('vehicles.assignments.view'), asyncHandler(async (request, response) => {
    const scoped = locationScope(request, 'vehicles.assignments.view'), clauses = [scoped.sql], params = [...scoped.params], type = txt(request.query.type);
    if (type) {
        if (!['PARC', 'SHOWROOM'].includes(type))
            throw new HttpError(400, "Type d'affectation invalide");
        clauses.push('vl.type=?');
        params.push(type);
    }
    if (request.query.active != null) {
        clauses.push('vl.is_active=?');
        params.push(String(request.query.active) === 'true' ? 1 : 0);
    }
    const rows = await query(`SELECT vl.*,a.name agency_name FROM vehicle_locations vl JOIN agencies a ON a.id=vl.agency_id WHERE ${clauses.join(' AND ')} ORDER BY a.name,vl.type,vl.name`, params);
    response.json(rows.map(locationDto));
}));
vehicleRouter.post('/vehicle-locations', requirePermission('vehicles.assignments.manage'), asyncHandler(async (request, response) => {
    const agencyId = await agency(request, 'vehicles.assignments.manage', request.body.agencyId), name = txt(request.body.name, 120), type = txt(request.body.type);
    if (!name)
        throw new HttpError(400, "Le nom de l'affectation est obligatoire");
    if (!['PARC', 'SHOWROOM'].includes(type))
        throw new HttpError(400, "Type d'affectation invalide");
    try {
        const result = await execute('INSERT INTO vehicle_locations(agency_id,name,type,created_by) VALUES(?,?,?,?)', [agencyId, name, type, request.user.sub]);
        response.status(201).json({ id: String(result.insertId) });
    }
    catch (error) {
        if (error?.code === 'ER_DUP_ENTRY')
            throw new HttpError(409, 'Cette affectation existe déjà dans cette agence');
        throw error;
    }
}));
vehicleRouter.patch('/vehicle-locations/:id', requirePermission('vehicles.assignments.manage'), asyncHandler(async (request, response) => {
    const id = idOf(request.params.id), [row] = await query('SELECT * FROM vehicle_locations WHERE id=?', [id]);
    if (!row)
        throw new HttpError(404, 'Affectation introuvable');
    await assertAgencyPermissionScope(request, 'vehicles.assignments.manage', String(row.agency_id));
    const sets = [], params = [];
    if (Object.hasOwn(request.body, 'name')) {
        const name = txt(request.body.name, 120);
        if (!name)
            throw new HttpError(400, 'Le nom est obligatoire');
        sets.push('name=?');
        params.push(name);
    }
    if (Object.hasOwn(request.body, 'isActive')) {
        sets.push('is_active=?');
        params.push(Boolean(request.body.isActive));
    }
    if (!sets.length)
        throw new HttpError(400, 'Aucune modification reconnue');
    try {
        await execute(`UPDATE vehicle_locations SET ${sets.join(',')} WHERE id=?`, [...params, id]);
        response.json({ success: true });
    }
    catch (error) {
        if (error?.code === 'ER_DUP_ENTRY')
            throw new HttpError(409, 'Cette affectation existe déjà dans cette agence');
        throw error;
    }
}));
vehicleRouter.get('/vehicle-transfer-agencies', requirePermission('vehicles.assign_agency'), asyncHandler(async (request, response) => {
    const scoped = vehicleScope(request, 'vehicles.assign_agency', 'a');
    const rows = await query(`SELECT a.id,a.name FROM agencies a WHERE a.is_active=TRUE AND ${scoped.sql} ORDER BY a.name`, scoped.params);
    response.json(rows.map(row => ({ id: String(row.id), name: String(row.name) })));
}));
vehicleRouter.get('/vehicle-transfer-locations', requirePermission('vehicles.assign_agency'), asyncHandler(async (request, response) => {
    const scoped = vehicleScope(request, 'vehicles.assign_agency', 'vl');
    const rows = await query(`SELECT vl.*,a.name agency_name FROM vehicle_locations vl JOIN agencies a ON a.id=vl.agency_id WHERE vl.is_active=TRUE AND ${scoped.sql} ORDER BY a.name,vl.type,vl.name`, scoped.params);
    response.json(rows.map(locationDto));
}));
export function vehicleStatsQuery(request) {
    const scoped = vehicleScope(request, 'vehicles.view', 'v', request.query.agencyId);
    const finance = hasFinance(request);
    const financialScoped = finance ? vehicleScope(request, 'vehicles.financials.view', 'v', request.query.agencyId) : null;
    const financialSelect = financialScoped ? `,COALESCE(SUM(CASE WHEN v.status IN('received','preparation','available','reserved') AND (${financialScoped.sql}) THEN v.sale_price ELSE 0 END),0) stock_value` : '';
    return {
        sql: `SELECT COUNT(*) total,SUM(v.status='ordered') ordered,SUM(v.status='in_transit') in_transit,SUM(v.status='received') received,SUM(v.status='preparation') preparation,SUM(v.status='available') available,SUM(v.status='reserved') reserved,SUM(v.status='sold') sold,SUM(v.status='delivered') delivered,SUM(v.entry_date<DATE_SUB(CURDATE(),INTERVAL 60 DAY)) dormant${financialSelect} FROM vehicles v WHERE v.archived_at IS NULL AND ${scoped.sql}`,
        params: financialScoped ? [...financialScoped.params, ...scoped.params] : scoped.params,
        finance,
    };
}
vehicleRouter.get('/vehicles/stats', requirePermission('vehicles.view'), asyncHandler(async (request, response) => {
    const statsQuery = vehicleStatsQuery(request);
    const [row] = await query(statsQuery.sql, statsQuery.params);
    const availableForSale = Number(row?.available ?? 0);
    response.json({ total: Number(row?.total ?? 0), ordered: Number(row?.ordered ?? 0), inTransit: Number(row?.in_transit ?? 0), received: Number(row?.received ?? 0), preparation: Number(row?.preparation ?? 0), available: availableForSale, availableForSale, reserved: Number(row?.reserved ?? 0), sold: Number(row?.sold ?? 0), delivered: Number(row?.delivered ?? 0), dormant: Number(row?.dormant ?? 0), ...(statsQuery.finance ? { stockValue: Number(row?.stock_value ?? 0) } : {}) });
}));
vehicleRouter.get('/vehicles/location-counts', requirePermission('vehicles.view'), asyncHandler(async (request, response) => {
    const scoped = vehicleScope(request, 'vehicles.view'), view = txt(request.query.view) || 'active';
    const viewSql = vehicleInventoryViewSql(view);
    const [row] = await query(`SELECT COUNT(*) total,SUM(vl.type='PARC') park,SUM(vl.type='SHOWROOM') showroom,SUM(v.vehicle_location_id IS NULL) unassigned FROM vehicles v LEFT JOIN vehicle_locations vl ON vl.id=v.vehicle_location_id WHERE v.archived_at IS NULL AND ${scoped.sql}${viewSql}`, scoped.params);
    response.json({ total: Number(row?.total ?? 0), park: Number(row?.park ?? 0), showroom: Number(row?.showroom ?? 0), unassigned: Number(row?.unassigned ?? 0) });
}));
vehicleRouter.get('/vehicles/agencies/create', requirePermission('vehicles.create'), asyncHandler(async (request, response) => {
    const scoped = grant(request, 'vehicles.create'), current = request.user?.agencyId;
    if (scoped === 'OWN')
        throw new HttpError(403, 'Le scope OWN ne s’applique pas au stock véhicules');
    if (!current)
        throw new HttpError(403, 'Aucune agence associée');
    const predicate = scoped === 'GLOBAL' ? { sql: '1=1', params: [] } : scoped === 'CONCESSION' ? { sql: 'a.concession_id=(SELECT concession_id FROM agencies WHERE id=?)', params: [current] } : scoped === 'AGENCY' ? { sql: 'a.id=?', params: [current] } : null;
    if (!predicate)
        throw new HttpError(403, 'Scope manquant pour vehicles.create');
    const rows = await query(`SELECT a.id,a.name,a.code,a.concession_id,c.currency_code,(SELECT concession_id FROM agencies WHERE id=?) actor_concession_id FROM agencies a JOIN concessions c ON c.id=a.concession_id WHERE a.is_active=TRUE AND ${predicate.sql} ORDER BY a.name`, [current, ...predicate.params]);
    const financialScope = grant(request, 'vehicles.financials.view');
    response.json(rows.map(row => ({ id: String(row.id), name: String(row.name), code: String(row.code), currencyCode: String(row.currency_code ?? 'XAF'), financialAllowed: financialScope === 'GLOBAL' || financialScope === 'CONCESSION' && String(row.concession_id) === String(row.actor_concession_id) || financialScope === 'AGENCY' && String(row.id) === String(current) })));
}));
const baseSelect = `SELECT v.*,ve.name version,m.id model_id,m.name model,b.id brand_id,b.name brand,a.name agency_name,c.currency_code,vl.name location_name,vl.type location_type,vl.is_active location_active,s.name supplier_name,CONCAT_WS(' ',u.first_name,u.last_name) created_by_name,(SELECT vi.file_path FROM vehicle_images vi WHERE vi.vehicle_id=v.id ORDER BY vi.is_primary DESC,vi.sort_order,vi.id LIMIT 1) primary_image FROM vehicles v JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id JOIN agencies a ON a.id=v.agency_id JOIN concessions c ON c.id=a.concession_id LEFT JOIN vehicle_locations vl ON vl.id=v.vehicle_location_id LEFT JOIN suppliers s ON s.id=v.supplier_id LEFT JOIN users u ON u.id=v.created_by`;
async function vehicleLocation(connection, agencyId, value, allowInactive = false) { const locationId = integer(value, 'Affectation'); if (locationId == null)
    return null; const [rows] = await connection.execute(`SELECT id FROM vehicle_locations WHERE id=? AND agency_id=?${allowInactive ? '' : ' AND is_active=TRUE'}`, [locationId, agencyId]); if (!rows[0])
    throw new HttpError(400, 'Affectation véhicule invalide ou inactive pour cette agence'); return locationId; }
async function vehicleSupplier(connection, value) { const supplierId = integer(value, 'Fournisseur'); if (supplierId == null)
    return null; const [rows] = await connection.execute('SELECT id FROM suppliers WHERE id=? AND is_active=TRUE AND is_vehicle_supplier=TRUE', [supplierId]); if (!rows[0])
    throw new HttpError(400, 'Fournisseur véhicule invalide, inactif ou non qualifié'); return supplierId; }
export function assertStockVehicleMutable(status) { if (['sold', 'delivered'].includes(String(status)))
    throw new HttpError(409, 'Un véhicule vendu ou livré est verrouillé dans Stock Véhicules'); }
export function mapVehicle(row, finance = Boolean(row.financial_allowed)) { const result = { id: String(row.id), vin: row.vin, stockNumber: row.stock_number, registrationNumber: row.registration_number, vehicleType: row.vehicle_type, bodyType: row.body_type, year: row.year, firstRegistrationDate: row.first_registration_date, color: row.color, interiorColor: row.interior_color, fuelType: row.fuel_type, engine: row.engine, transmission: row.transmission, fiscalPower: row.fiscal_power, realPower: row.real_power, co2Emissions: row.co2_emissions, mileage: Number(row.mileage ?? 0), status: row.status, entryDate: row.entry_date, notes: row.notes, brandId: String(row.brand_id), brand: row.brand, modelId: String(row.model_id), model: row.model, versionId: String(row.version_id), version: row.version, agencyId: String(row.agency_id), agencyName: row.agency_name, currencyCode: String(row.currency_code ?? 'XAF'), locationId: row.vehicle_location_id == null ? null : String(row.vehicle_location_id), locationName: row.location_name, locationType: row.location_type, locationActive: row.location_active == null ? null : Boolean(row.location_active), supplierId: row.supplier_id == null ? null : String(row.supplier_id), supplierName: row.supplier_name, createdById: row.created_by == null ? null : String(row.created_by), createdByName: row.created_by_name, primaryImage: row.primary_image, createdAt: row.created_at, updatedAt: row.updated_at, catalogPrice: Number(row.catalog_price ?? 0), salePrice: Number(row.sale_price ?? 0) }; if (finance)
    Object.assign(result, { purchasePrice: Number(row.purchase_price ?? 0), refurbishmentCost: Number(row.refurbishment_cost ?? 0), transportCost: Number(row.transport_cost ?? 0), administrativeCost: Number(row.administrative_cost ?? 0), additionalCosts: Number(row.additional_costs ?? 0), minimumPrice: Number(row.minimum_price ?? 0), discount: Number(row.discount ?? 0) }); return result; }
const vehicleReadSelect = (request) => { const finance = permissionScopePredicate(request, 'vehicles.financials.view', { agency: 'v.agency_id' }); return { sql: baseSelect.replace(' FROM vehicles', `,${finance ? `IF(${finance.sql},1,NULL)` : 'NULL'} financial_allowed FROM vehicles`), params: finance?.params ?? [] }; };
async function accessible(id, request, permission = 'vehicles.view') { const scoped = vehicleScope(request, permission), select = vehicleReadSelect(request); const [row] = await query(`${select.sql} WHERE v.id=? AND v.archived_at IS NULL AND ${scoped.sql}`, [...select.params, id, ...scoped.params]); if (!row)
    throw new HttpError(404, 'Véhicule introuvable'); return row; }
async function notify(request, vehicleId, agencyId, event, subject, message) { emitToAgency(agencyId, event, { vehicleId, agencyId }); if (!['vehicles:created', 'vehicles:status-changed', 'vehicles:transferred', 'vehicles:archived'].includes(event))
    return; await notifyPermissions({ agencyId, permissions: ['vehicles.view'], excludeUserIds: [request.user.sub], subject, message, eventType: event.replace(':', '.'), referenceType: 'vehicle', referenceId: vehicleId, priority: event === 'vehicles:transferred' ? 'high' : 'normal' }); }
vehicleRouter.get('/documents/business/vehicle/:id/pdf', requirePermission('vehicles.view'), asyncHandler(async (request, response) => { const row = await accessible(idOf(request.params.id), request); const data = mapVehicle(row); const pdf = await renderVehicleDocumentData(data); response.setHeader('Content-Type', 'application/pdf'); response.setHeader('Content-Disposition', `${request.query.download === 'true' ? 'attachment' : 'inline'}; filename="${data.stockNumber}.pdf"`); response.send(pdf); }));
vehicleRouter.get('/vehicle-references', requirePermission('vehicles.view'), asyncHandler(async (request, response) => { const agencyId = await agency(request, 'vehicles.view', request.query.agencyId); const [brands, models, versions, locations, suppliers, features] = await Promise.all([query('SELECT id,name,code FROM brands WHERE is_active=TRUE ORDER BY name'), query('SELECT id,brand_id,name,code FROM models WHERE is_active=TRUE ORDER BY name'), query('SELECT id,model_id,name,engine,fuel_type,transmission,power FROM versions WHERE is_active=TRUE ORDER BY name'), query('SELECT id,agency_id,name,type FROM vehicle_locations WHERE is_active=TRUE AND agency_id=? ORDER BY type,name', [agencyId]), query('SELECT id,name,code FROM suppliers WHERE is_active=TRUE AND is_vehicle_supplier=TRUE ORDER BY name'), query('SELECT id,name FROM vehicle_features WHERE is_active=TRUE ORDER BY name')]); response.json({ brands, models, versions, locations, suppliers, features }); }));
vehicleRouter.get('/vehicles/filter-options', requirePermission('vehicles.view'), asyncHandler(async (request, response) => {
    const scoped = vehicleScope(request, 'vehicles.view');
    const view = txt(request.query.view) || 'active';
    const viewSql = vehicleInventoryViewSql(view);
    const brandId = txt(request.query.brandId);
    if (brandId && !/^[1-9]\d*$/.test(brandId))
        throw new HttpError(400, 'Filtre marque invalide');
    const locationType = txt(request.query.locationType);
    if (locationType && !['PARC', 'SHOWROOM'].includes(locationType))
        throw new HttpError(400, "Type d'affectation invalide");
    const [brands, models, locations] = await Promise.all([
        query(`SELECT DISTINCT b.id,b.name FROM vehicles v JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id WHERE v.archived_at IS NULL AND ${scoped.sql}${viewSql} ORDER BY b.name`, scoped.params),
        query(`SELECT DISTINCT m.id,m.brand_id,m.name FROM vehicles v JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id WHERE v.archived_at IS NULL AND ${scoped.sql}${viewSql}${brandId ? ' AND m.brand_id=?' : ''} ORDER BY m.name`, brandId ? [...scoped.params, brandId] : scoped.params),
        query(`SELECT DISTINCT vl.id,vl.name,vl.type,vl.agency_id,a.name agency_name FROM vehicle_locations vl JOIN agencies a ON a.id=vl.agency_id WHERE vl.is_active=TRUE AND ${vehicleScope(request, 'vehicles.view', 'vl').sql}${locationType ? ' AND vl.type=?' : ''} ORDER BY vl.type,vl.name`, [...vehicleScope(request, 'vehicles.view', 'vl').params, ...(locationType ? [locationType] : [])]),
    ]);
    response.json({ brands: brands.map(row => ({ id: String(row.id), name: String(row.name) })), models: models.map(row => ({ id: String(row.id), brandId: String(row.brand_id), name: String(row.name) })), locations: locations.map(row => ({ id: String(row.id), name: String(row.name), type: String(row.type), agencyId: String(row.agency_id), agencyName: String(row.agency_name) })) });
}));
vehicleRouter.get('/vehicles', requirePermission('vehicles.view'), asyncHandler(async (request, response) => {
    const scoped = vehicleScope(request, 'vehicles.view'), clauses = [scoped.sql, 'v.archived_at IS NULL'], params = [...scoped.params];
    const requestedStatus = txt(request.query.status), view = txt(request.query.view) || 'active';
    vehicleInventoryViewSql(view);
    if (!requestedStatus) {
        if (view === 'active')
            clauses.push("v.status NOT IN('sold','delivered')");
        if (view === 'sold')
            clauses.push("v.status IN('sold','delivered')");
    }
    for (const [key, column, allowed] of [['status', 'v.status', DB_STATUSES], ['type', 'v.vehicle_type', ACTIVE_TYPES]]) {
        const value = txt(request.query[key]);
        if (value) {
            if (!allowed.includes(value))
                throw new HttpError(400, `Filtre ${key} invalide`);
            clauses.push(`${column}=?`);
            params.push(value);
        }
    }
    for (const [key, column, label] of [['brandId', 'b.id', 'marque'], ['modelId', 'm.id', 'modèle']]) {
        const value = txt(request.query[key]);
        if (value) {
            if (!/^[1-9]\d*$/.test(value))
                throw new HttpError(400, `Filtre ${label} invalide`);
            clauses.push(`${column}=?`);
            params.push(value);
        }
    }
    const fuel = txt(request.query.fuel);
    if (fuel) {
        clauses.push('v.fuel_type=?');
        params.push(fuel);
    }
    const locationType = txt(request.query.locationType);
    if (locationType) {
        if (!['PARC', 'SHOWROOM'].includes(locationType))
            throw new HttpError(400, "Type d'affectation invalide");
        clauses.push('vl.type=?');
        params.push(locationType);
    }
    const assignment = txt(request.query.assignment);
    if (assignment === 'unassigned')
        clauses.push('v.vehicle_location_id IS NULL');
    else if (assignment) {
        if (!/^[1-9]\d*$/.test(assignment))
            throw new HttpError(400, 'Affectation invalide');
        clauses.push('v.vehicle_location_id=?');
        params.push(assignment);
    }
    const dormant = txt(request.query.dormant);
    if (dormant === 'true')
        clauses.push('v.entry_date<DATE_SUB(CURDATE(),INTERVAL 60 DAY)');
    const search = txt(request.query.search, 120);
    if (search) {
        const term = `%${search}%`;
        clauses.push(`(b.name LIKE ? OR m.name LIKE ? OR ve.name LIKE ? OR v.vin LIKE ? OR v.stock_number LIKE ? OR v.registration_number LIKE ?)`);
        params.push(term, term, term, term, term, term);
    }
    const requestedPage = Math.max(1, Number(request.query.page) || 1), pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize) || 20)), order = { oldest: 'v.entry_date ASC,v.id ASC', price_asc: 'v.sale_price ASC,v.id ASC', price_desc: 'v.sale_price DESC,v.id DESC', mileage: 'v.mileage ASC,v.id ASC' }[txt(request.query.sort)] ?? 'v.created_at DESC,v.id DESC', filterFrom = 'FROM vehicles v JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id LEFT JOIN vehicle_locations vl ON vl.id=v.vehicle_location_id';
    const [total] = await query(`SELECT COUNT(*) total ${filterFrom} WHERE ${clauses.join(' AND ')}`, params), totalCount = Number(total?.total ?? 0), totalPages = Math.ceil(totalCount / pageSize), page = Math.min(requestedPage, Math.max(1, totalPages)), ids = await query(`SELECT v.id ${filterFrom} WHERE ${clauses.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    const vehicleIds = ids.map(row => String(row.id)), select = vehicleReadSelect(request), rows = vehicleIds.length ? await query(`${select.sql} WHERE v.id IN (${vehicleIds.map(() => '?').join(',')}) ORDER BY FIELD(v.id,${vehicleIds.map(() => '?').join(',')})`, [...select.params, ...vehicleIds, ...vehicleIds]) : [];
    response.json({ items: rows.map(row => mapVehicle(row)), total: totalCount, page, pageSize, totalPages });
}));
vehicleRouter.get('/vehicles/:id', requirePermission('vehicles.view'), asyncHandler(async (request, response) => response.json(mapVehicle(await accessible(idOf(request.params.id), request)))));
vehicleRouter.get('/vehicles/:id/360', requirePermission('vehicles.view'), asyncHandler(async (request, response) => {
    const id = idOf(request.params.id), vehicle = await accessible(id, request, 'vehicles.view'), context = request.rbac, salesScope = permissionScopePredicate(request, 'sales.view', { agency: 's.agency_id', owner: 's.salesperson_id' }), customerScope = permissionScopePredicate(request, 'customers.view', { agency: 'c.agency_id', owner: 'c.assigned_user_id', ownRequiresAgency: false }), serviceScope = permissionScopePredicate(request, 'service.order.view', { agency: 'ro.agency_id', owner: 'ro.advisor_id' }), deliveryScope = permissionScopePredicate(request, 'delivery.view', { agency: 'd.agency_id', owner: 'd.delivery_specialist_id' });
    const sections = { sales: Boolean(salesScope), customers: Boolean(customerScope), service: Boolean(serviceScope), deliveries: Boolean(deliveryScope), documents: can(context, 'ged.view'), financials: Boolean(vehicle.financial_allowed) };
    const [images, features, statusHistory, movements] = await Promise.all([
        query('SELECT id,file_path,thumbnail_path,mime_type,file_size,sort_order,is_primary,created_at FROM vehicle_images WHERE vehicle_id=? ORDER BY is_primary DESC,sort_order,id', [id]),
        query('SELECT vf.id,vf.name FROM vehicle_features vf JOIN vehicle_feature_assignments vfa ON vfa.feature_id=vf.id WHERE vfa.vehicle_id=? ORDER BY vf.name', [id]),
        query(`SELECT h.id,h.old_status,h.new_status,h.reason,h.changed_at,CONCAT_WS(' ',u.first_name,u.last_name) changed_by_name FROM vehicle_status_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.vehicle_id=? ORDER BY h.changed_at DESC`, [id]),
        query(`SELECT vm.*,fvl.name from_location_name,tvl.name to_location_name,fvl.type from_location_type,tvl.type to_location_type,fa.name from_agency_name,ta.name to_agency_name,CONCAT_WS(' ',u.first_name,u.last_name) performed_by_name FROM vehicle_movements vm LEFT JOIN vehicle_locations fvl ON fvl.id=vm.from_vehicle_location_id LEFT JOIN vehicle_locations tvl ON tvl.id=vm.to_vehicle_location_id LEFT JOIN agencies fa ON fa.id=vm.from_agency_id LEFT JOIN agencies ta ON ta.id=vm.to_agency_id LEFT JOIN users u ON u.id=vm.performed_by WHERE vm.vehicle_id=? ORDER BY vm.moved_at DESC,vm.id DESC`, [id]),
    ]);
    const vehicleAgency = String(vehicle.agency_id);
    const sales = sections.sales ? await query(`SELECT s.id,s.sale_number,s.customer_id,s.status,s.total,s.created_at,${sections.customers ? "CONCAT_WS(' ',c.first_name,c.last_name)" : "NULL"} customer_name FROM sale_items si JOIN sales s ON s.id=si.sale_id ${sections.customers ? 'JOIN customers c ON c.id=s.customer_id' : ''} WHERE si.vehicle_id=? AND s.agency_id=? AND ${salesScope.sql}${sections.customers ? ` AND c.agency_id=? AND ${customerScope.sql}` : ''} ORDER BY s.created_at DESC`, [id, vehicleAgency, ...salesScope.params, ...(sections.customers ? [vehicleAgency, ...customerScope.params] : [])]) : [];
    const reservations = sections.sales ? await query(`SELECT r.id,r.status,r.reserved_at,r.expires_at,r.customer_id,${sections.customers ? "CONCAT_WS(' ',c.first_name,c.last_name)" : "NULL"} customer_name FROM reservations r JOIN sales s ON s.id=r.sale_id ${sections.customers ? 'JOIN customers c ON c.id=r.customer_id' : ''} WHERE r.vehicle_id=? AND s.agency_id=? AND ${salesScope.sql}${sections.customers ? ` AND c.agency_id=? AND ${customerScope.sql}` : ''} ORDER BY r.reserved_at DESC`, [id, vehicleAgency, ...salesScope.params, ...(sections.customers ? [vehicleAgency, ...customerScope.params] : [])]) : [];
    const repairOrders = sections.service ? await query(`SELECT ro.id,ro.order_number,ro.customer_id,ro.status,ro.complaint,ro.created_at FROM repair_orders ro WHERE ro.vehicle_id=? AND ro.agency_id=? AND ${serviceScope.sql} ORDER BY ro.created_at DESC`, [id, vehicleAgency, ...serviceScope.params]) : [];
    const deliveries = sections.deliveries ? await query(`SELECT d.id,d.delivery_number,d.status,d.scheduled_at,d.delivered_at FROM deliveries d WHERE d.vehicle_id=? AND d.agency_id=? AND ${deliveryScope.sql} ORDER BY d.created_at DESC`, [id, vehicleAgency, ...deliveryScope.params]) : [];
    const documents = sections.documents ? await query(`SELECT id,document_type,file_name,file_url,mime_type,file_size,created_at FROM documents WHERE entity_type='vehicle' AND entity_id=? AND is_archived=FALSE ORDER BY created_at DESC`, [id]) : [];
    const priceHistory = sections.financials ? await query(`SELECT h.*,CONCAT_WS(' ',u.first_name,u.last_name) changed_by_name FROM vehicle_price_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.vehicle_id=? ORDER BY h.changed_at DESC,h.id DESC`, [id]) : [];
    const [warranty] = sections.sales ? await query(`SELECT vwc.*,wp.name provider_name FROM vehicle_warranty_contracts vwc LEFT JOIN warranty_providers wp ON wp.id=vwc.provider_id JOIN sales s ON s.id=vwc.sale_id WHERE vwc.vehicle_id=? AND s.agency_id=? AND ${salesScope.sql} ORDER BY vwc.created_at DESC,vwc.id DESC LIMIT 1`, [id, vehicleAgency, ...salesScope.params]) : [];
    response.json({ vehicle: mapVehicle(vehicle, sections.financials), sections, images, features, statusHistory, movements, sales, reservations, repairOrders, deliveries, documents, priceHistory, warranty: warranty ?? null });
}));
vehicleRouter.post('/vehicles', requirePermission('vehicles.create'), asyncHandler(async (request, response) => {
    const vin = String(request.body.vin ?? '').trim().toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))
        throw new HttpError(400, 'Le VIN doit contenir 17 caractères valides');
    const brandName = txt(request.body.brand, 120), modelName = txt(request.body.model, 120), versionName = txt(request.body.version, 150) || 'Standard';
    if (!brandName || !modelName)
        throw new HttpError(400, 'La marque et le modèle sont obligatoires');
    const vehicleType = txt(request.body.vehicleType) || 'new';
    if (!ACTIVE_TYPES.includes(vehicleType))
        throw new HttpError(400, 'Le type doit être VN ou VO');
    const initialStatus = txt(request.body.status) || 'received';
    if (!ADMINISTRABLE_VEHICLE_STATUSES.includes(initialStatus))
        throw new HttpError(400, 'Statut initial manuel invalide');
    const agencyId = await agency(request, 'vehicles.create', request.body.agencyId);
    if (hasFinancialPayload(request.body))
        await assertAgencyPermissionScope(request, 'vehicles.financials.view', agencyId);
    const featureNames = jsonField(request.body.features, []).map(value => txt(value, 150)).filter(Boolean);
    assertCostTotal(['purchasePrice', 'refurbishmentCost', 'transportCost', 'administrativeCost', 'additionalCosts'].map(field => amount(request.body[field], field)));
    const result = await withStagedVehicleImages(jsonField(request.body.images, []), staged => transaction(async (connection) => {
        const locationId = await vehicleLocation(connection, agencyId, request.body.locationId);
        if (initialStatus === 'available' && locationId == null)
            throw new HttpError(409, 'Un véhicule disponible doit être affecté à un Parc ou un Showroom actif');
        const supplierId = await vehicleSupplier(connection, request.body.supplierId);
        let [brands] = await connection.execute('SELECT id FROM brands WHERE name=? LIMIT 1', [brandName]);
        let brandId = brands[0]?.id;
        if (!brandId) {
            const [insert] = await connection.execute('INSERT INTO brands(name,code) VALUES(?,?)', [brandName, `${brandName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 35)}-${Date.now().toString().slice(-6)}`]);
            brandId = insert.insertId;
        }
        let [models] = await connection.execute('SELECT id FROM models WHERE brand_id=? AND name=? LIMIT 1', [brandId, modelName]);
        let modelId = models[0]?.id;
        if (!modelId) {
            const [insert] = await connection.execute('INSERT INTO models(brand_id,name) VALUES(?,?)', [brandId, modelName]);
            modelId = insert.insertId;
        }
        let [versions] = await connection.execute('SELECT id FROM versions WHERE model_id=? AND name=? LIMIT 1', [modelId, versionName]);
        let versionId = versions[0]?.id;
        if (!versionId) {
            const [insert] = await connection.execute('INSERT INTO versions(model_id,name,engine,fuel_type,transmission) VALUES(?,?,?,?,?)', [modelId, versionName, optional(request.body.engine, 120), optional(request.body.fuelType, 50), optional(request.body.transmission, 50)]);
            versionId = insert.insertId;
        }
        const [insert] = await connection.execute(`INSERT INTO vehicles(version_id,agency_id,vehicle_location_id,supplier_id,vehicle_type,vin,registration_number,body_type,year,first_registration_date,color,interior_color,fuel_type,engine,transmission,fiscal_power,real_power,co2_emissions,mileage,purchase_price,refurbishment_cost,transport_cost,administrative_cost,additional_costs,catalog_price,sale_price,minimum_price,status,entry_date,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),?,?)`, [versionId, agencyId, locationId, supplierId, vehicleType, vin, optional(request.body.registrationNumber, 50)?.toUpperCase() ?? null, optional(request.body.bodyType, 60), integer(request.body.year, 'Année'), optional(request.body.firstRegistrationDate, 10), optional(request.body.color, 80), optional(request.body.interiorColor, 80), optional(request.body.fuelType, 50), optional(request.body.engine, 120), optional(request.body.transmission, 50), integer(request.body.fiscalPower, 'Puissance fiscale'), integer(request.body.realPower, 'Puissance réelle'), integer(request.body.co2Emissions, 'Émissions CO2'), integer(request.body.mileage, 'Kilométrage') ?? 0, amount(request.body.purchasePrice, 'Prix achat'), amount(request.body.refurbishmentCost, 'Remise en état'), amount(request.body.transportCost, 'Transport'), amount(request.body.administrativeCost, 'Frais administratifs'), amount(request.body.additionalCosts, 'Autres frais'), amount(request.body.catalogPrice, 'Prix catalogue'), amount(request.body.salePrice, 'Prix vente'), amount(request.body.minimumPrice, 'Prix minimum'), initialStatus, optional(request.body.notes, 5000), request.user.sub]);
        const id = String(insert.insertId);
        await connection.execute('UPDATE vehicles SET stock_number=? WHERE id=?', [`STK-${String(insert.insertId).padStart(6, '0')}`, id]);
        await connection.execute(`INSERT INTO vehicle_status_history(vehicle_id,old_status,new_status,changed_by,reason) VALUES(?,NULL,?,?,'Entrée initiale en stock')`, [id, initialStatus, request.user.sub]);
        await connection.execute(`INSERT INTO vehicle_movements(vehicle_id,to_vehicle_location_id,to_agency_id,movement_type,reason,performed_by) VALUES(?,?,?,'entry','Entrée initiale en stock',?)`, [id, locationId, agencyId, request.user.sub]);
        for (const name of featureNames) {
            let [rows] = await connection.execute('SELECT id FROM vehicle_features WHERE name=?', [name]);
            let featureId = rows[0]?.id;
            if (!featureId) {
                const [created] = await connection.execute('INSERT INTO vehicle_features(name) VALUES(?)', [name]);
                featureId = created.insertId;
            }
            await connection.execute('INSERT IGNORE INTO vehicle_feature_assignments(vehicle_id,feature_id) VALUES(?,?)', [id, featureId]);
        }
        await insertVehicleImages(connection, id, request.user.sub, staged, 0, true);
        await finalizeVehicleImages(staged);
        return { id, agencyId: String(agencyId) };
    }), { isPersisted: files => vehicleImageFilesPersisted(files, undefined, vin) });
    await notify(request, result.id, result.agencyId, 'vehicles:created', 'Nouveau véhicule en stock', `${brandName} ${modelName} (${vin}) a été enregistré`);
    response.status(201).json(mapVehicle(await accessible(result.id, request, 'vehicles.create')));
}));
vehicleRouter.patch('/vehicles/:id', requirePermission('vehicles.update'), asyncHandler(async (request, response) => {
    const id = idOf(request.params.id), before = await accessible(id, request, 'vehicles.update');
    assertStockVehicleMutable(before.status);
    if (Object.hasOwn(request.body, 'locationId'))
        throw new HttpError(409, "Utilisez l'action Transférer pour modifier l'affectation physique");
    if (Object.hasOwn(request.body, 'vehicleType') && !ACTIVE_TYPES.includes(txt(request.body.vehicleType)))
        throw new HttpError(400, 'Le type doit être VN ou VO');
    const allowed = { vehicleType: 'vehicle_type', registrationNumber: 'registration_number', bodyType: 'body_type', year: 'year', firstRegistrationDate: 'first_registration_date', color: 'color', interiorColor: 'interior_color', fuelType: 'fuel_type', engine: 'engine', transmission: 'transmission', fiscalPower: 'fiscal_power', realPower: 'real_power', co2Emissions: 'co2_emissions', mileage: 'mileage', supplierId: 'supplier_id', notes: 'notes' };
    const numericFields = new Set(['year', 'fiscalPower', 'realPower', 'co2Emissions', 'mileage', 'supplierId']);
    const amountFields = new Set(VEHICLE_FINANCIAL_FIELDS);
    if (hasFinancialPayload(request.body)) {
        await assertAgencyPermissionScope(request, 'vehicles.financials.view', String(before.agency_id));
        Object.assign(allowed, { purchasePrice: 'purchase_price', refurbishmentCost: 'refurbishment_cost', transportCost: 'transport_cost', administrativeCost: 'administrative_cost', additionalCosts: 'additional_costs', catalogPrice: 'catalog_price', salePrice: 'sale_price', minimumPrice: 'minimum_price' });
    }
    if (hasFinancialPayload(request.body))
        assertCostTotal([['purchasePrice', 'purchase_price'], ['refurbishmentCost', 'refurbishment_cost'], ['transportCost', 'transport_cost'], ['administrativeCost', 'administrative_cost'], ['additionalCosts', 'additional_costs']].map(([field, column]) => Object.hasOwn(request.body, field) ? amount(request.body[field], field) : before[column]));
    const sets = [], params = [];
    for (const [field, column] of Object.entries(allowed))
        if (Object.hasOwn(request.body, field)) {
            const raw = request.body[field];
            const value = amountFields.has(field) ? amount(raw, field) : numericFields.has(field) ? integer(raw, field) : field === 'registrationNumber' ? optional(raw, 50)?.toUpperCase() ?? null : optional(raw, field === 'notes' ? 5000 : 255);
            sets.push(`${column}=?`);
            params.push(value);
        }
    if (!sets.length)
        throw new HttpError(400, 'Aucune modification reconnue');
    await transaction(async (connection) => {
        const [locked] = await connection.execute('SELECT status FROM vehicles WHERE id=? FOR UPDATE', [id]);
        assertStockVehicleMutable(locked[0]?.status);
        if (Object.hasOwn(request.body, 'supplierId'))
            await vehicleSupplier(connection, request.body.supplierId);
        await connection.execute(`UPDATE vehicles SET ${sets.join(',')} WHERE id=?`, [...params, id]);
        if (request.body.salePrice != null || request.body.minimumPrice != null)
            await connection.execute('INSERT INTO vehicle_price_history(vehicle_id,old_sale_price,new_sale_price,old_minimum_price,new_minimum_price,changed_by,reason) VALUES(?,?,?,?,?,?,?)', [id, before.sale_price, request.body.salePrice ?? before.sale_price, before.minimum_price, request.body.minimumPrice ?? before.minimum_price, request.user.sub, optional(request.body.reason)]);
        await connection.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,old_values,new_values,ip_address,user_agent) VALUES(?,'vehicles','vehicle',?,'update',?,?,?,?)`, [request.user.sub, id, JSON.stringify(mapVehicle(before, true)), JSON.stringify(request.body), request.ip ?? null, request.get('user-agent') ?? null]);
    });
    await notify(request, id, String(before.agency_id), 'vehicles:updated', 'Véhicule modifié', `${before.stock_number} a été mis à jour`);
    response.json(mapVehicle(await accessible(id, request, 'vehicles.update')));
}));
export function assertManualVehicleTransition(current, next) { if (!ADMINISTRABLE_VEHICLE_STATUSES.includes(current))
    throw new HttpError(409, `Le statut ${current} n'est plus administrable depuis Stock Véhicules`); if (!ADMINISTRABLE_VEHICLE_STATUSES.includes(next))
    throw new HttpError(409, `Le statut ${next} doit être produit par son workflow métier`); if (current === next)
    throw new HttpError(409, 'Le véhicule possède déjà ce statut'); }
async function assertTransferTarget(request, toAgencyId) { const value = grant(request, 'vehicles.assign_agency'), current = request.user?.agencyId; if (value === 'GLOBAL')
    return; if (value === 'AGENCY') {
    if (toAgencyId !== current)
        throw new HttpError(403, 'Le scope AGENCY ne permet pas un transfert inter-agences');
    return;
} if (value === 'CONCESSION') {
    const [row] = await query('SELECT id FROM agencies WHERE id=? AND concession_id=(SELECT concession_id FROM agencies WHERE id=?) AND is_active=TRUE', [toAgencyId, current]);
    if (row)
        return;
    throw new HttpError(403, 'Agence de destination hors concession');
} throw new HttpError(403, 'Scope de transfert insuffisant'); }
vehicleRouter.patch('/vehicles/:id/status', requirePermission('vehicles.status.update'), asyncHandler(async (request, response) => { const id = idOf(request.params.id); const row = await accessible(id, request, 'vehicles.status.update'); const next = txt(request.body.status); assertManualVehicleTransition(String(row.status), next); const reason = txt(request.body.reason, 255); if (!reason)
    throw new HttpError(400, 'Le motif du changement de statut est obligatoire'); if (next === 'available' && (row.vehicle_location_id == null || !row.location_active || !['PARC', 'SHOWROOM'].includes(String(row.location_type))))
    throw new HttpError(409, 'Un véhicule disponible doit être affecté à un Parc ou un Showroom actif'); await transaction(async (connection) => { await connection.execute('UPDATE vehicles SET status=? WHERE id=?', [next, id]); await connection.execute('INSERT INTO vehicle_status_history(vehicle_id,old_status,new_status,changed_by,reason) VALUES(?,?,?,?,?)', [id, row.status, next, request.user.sub, reason]); }); await notify(request, id, String(row.agency_id), 'vehicles:status-changed', 'Statut véhicule modifié', `${row.stock_number}: ${row.status} → ${next}`); response.json(mapVehicle(await accessible(id, request, 'vehicles.status.update'))); }));
vehicleRouter.post('/vehicles/:id/transfer', requirePermission('vehicles.assign_agency'), asyncHandler(async (request, response) => { const id = idOf(request.params.id); const row = await accessible(id, request, 'vehicles.assign_agency'); assertStockVehicleMutable(row.status); const toAgencyId = String(integer(request.body.toAgencyId, 'Agence', true)); await assertTransferTarget(request, toAgencyId); const reason = txt(request.body.reason, 255); if (!reason)
    throw new HttpError(400, 'Le motif du transfert est obligatoire'); await transaction(async (connection) => { const [locked] = await connection.execute('SELECT agency_id,vehicle_location_id,status FROM vehicles WHERE id=? FOR UPDATE', [id]), current = locked[0]; if (!current)
    throw new HttpError(404, 'Véhicule introuvable'); assertStockVehicleMutable(current.status); const [target] = await connection.execute('SELECT id FROM agencies WHERE id=? AND is_active=TRUE', [toAgencyId]); if (!target[0])
    throw new HttpError(400, 'Agence de destination invalide'); const validLocationId = await vehicleLocation(connection, toAgencyId, request.body.toLocationId); if (String(current.agency_id) === toAgencyId && String(current.vehicle_location_id ?? '') === String(validLocationId ?? ''))
    throw new HttpError(409, "Le véhicule possède déjà cette affectation"); await connection.execute('UPDATE vehicles SET agency_id=?,vehicle_location_id=? WHERE id=?', [toAgencyId, validLocationId, id]); await connection.execute(`INSERT INTO vehicle_movements(vehicle_id,from_vehicle_location_id,to_vehicle_location_id,from_agency_id,to_agency_id,movement_type,reason,performed_by) VALUES(?,?,?,?,?,'transfer',?,?)`, [id, current.vehicle_location_id, validLocationId, current.agency_id, toAgencyId, reason, request.user.sub]); }); emitToAgency(String(row.agency_id), 'vehicles:transferred', { vehicleId: id, toAgencyId }); emitToAgency(toAgencyId, 'vehicles:transferred', { vehicleId: id, toAgencyId }); response.json({ success: true }); }));
vehicleRouter.delete('/vehicles/:id', requirePermission('vehicles.archive'), asyncHandler(async (request, response) => { const id = idOf(request.params.id); const row = await accessible(id, request, 'vehicles.archive'); if (['reserved', 'sold', 'delivered'].includes(row.status))
    throw new HttpError(409, 'Un véhicule réservé, vendu ou livré ne peut pas être archivé'); await execute('UPDATE vehicles SET archived_at=NOW() WHERE id=?', [id]); await notify(request, id, String(row.agency_id), 'vehicles:archived', 'Véhicule archivé', `${row.stock_number} a été retiré du catalogue`); response.json({ success: true }); }));
async function insertVehicleImages(connection, vehicleId, userId, files, firstSort, makePrimary) { for (let index = 0; index < files.length; index++) {
    const file = files[index];
    await connection.execute('INSERT INTO vehicle_images(vehicle_id,file_path,thumbnail_path,mime_type,file_size,sort_order,is_primary,uploaded_by) VALUES(?,?,?,?,?,?,?,?)', [vehicleId, file.publicPath, file.publicPath, file.mime, file.size, firstSort + index, makePrimary && index === 0, userId]);
} }
async function vehicleImageFilesPersisted(files, vehicleId, vin) { const placeholders = files.map(() => '?').join(','), params = [...files.map(file => file.publicPath)]; let owner = ''; if (vehicleId) {
    owner = ' AND vi.vehicle_id=?';
    params.push(vehicleId);
}
else if (vin) {
    owner = ' AND v.vin=?';
    params.push(vin);
} const [row] = await query(`SELECT COUNT(DISTINCT vi.file_path) total FROM vehicle_images vi JOIN vehicles v ON v.id=vi.vehicle_id WHERE vi.file_path IN (${placeholders})${owner}`, params); return Number(row?.total) === files.length; }
vehicleRouter.post('/vehicles/:id/images', requirePermission('vehicles.images.manage'), asyncHandler(async (request, response) => { const id = idOf(request.params.id), row = await accessible(id, request, 'vehicles.images.manage'); assertStockVehicleMutable(row.status); const count = await withStagedVehicleImages(jsonField(request.body.images, []), staged => transaction(async (connection) => { await connection.execute('SELECT id FROM vehicles WHERE id=? FOR UPDATE', [id]); const [images] = await connection.execute('SELECT COUNT(*) total,COALESCE(MAX(sort_order),-1) max_sort FROM vehicle_images WHERE vehicle_id=?', [id]); if (Number(images[0]?.total ?? 0) + staged.length > 8)
    throw new HttpError(400, 'Maximum 8 images par véhicule'); await insertVehicleImages(connection, id, request.user.sub, staged, Number(images[0]?.max_sort ?? -1) + 1, Number(images[0]?.total ?? 0) === 0); await finalizeVehicleImages(staged); return staged.length; }), { isPersisted: files => vehicleImageFilesPersisted(files, id) }); await notify(request, id, String(row.agency_id), 'vehicles:image-added', 'Photos véhicule ajoutées', `${count} photo(s) ajoutée(s) à ${row.stock_number}`); response.status(201).json({ success: true }); }));
vehicleRouter.patch('/vehicles/:id/images/:imageId/primary', requirePermission('vehicles.images.manage'), asyncHandler(async (request, response) => { const id = idOf(request.params.id), imageId = idOf(request.params.imageId), vehicle = await accessible(id, request, 'vehicles.images.manage'); assertStockVehicleMutable(vehicle.status); await transaction(async (connection) => { await connection.execute('SELECT id FROM vehicles WHERE id=? FOR UPDATE', [id]); const [found] = await connection.execute('SELECT id FROM vehicle_images WHERE id=? AND vehicle_id=?', [imageId, id]); if (!found[0])
    throw new HttpError(404, 'Image introuvable'); await connection.execute('UPDATE vehicle_images SET is_primary=FALSE WHERE vehicle_id=?', [id]); await connection.execute('UPDATE vehicle_images SET is_primary=TRUE WHERE id=?', [imageId]); }); emitToAgency(String(vehicle.agency_id), 'vehicles:image-added', { vehicleId: id }); response.json({ success: true }); }));
vehicleRouter.patch('/vehicles/:id/images/order', requirePermission('vehicles.images.manage'), asyncHandler(async (request, response) => { const id = idOf(request.params.id), vehicle = await accessible(id, request, 'vehicles.images.manage'); assertStockVehicleMutable(vehicle.status); const imageIds = jsonField(request.body.imageIds, []); await transaction(async (connection) => { await connection.execute('SELECT id FROM vehicles WHERE id=? FOR UPDATE', [id]); for (let index = 0; index < imageIds.length; index++)
    await connection.execute('UPDATE vehicle_images SET sort_order=? WHERE id=? AND vehicle_id=?', [index, idOf(imageIds[index]), id]); }); response.json({ success: true }); }));
vehicleRouter.delete('/vehicles/:id/images/:imageId', requirePermission('vehicles.images.manage'), asyncHandler(async (request, response) => { const id = idOf(request.params.id), imageId = idOf(request.params.imageId), vehicle = await accessible(id, request, 'vehicles.images.manage'); assertStockVehicleMutable(vehicle.status); const image = await transaction(async (connection) => { await connection.execute('SELECT id FROM vehicles WHERE id=? FOR UPDATE', [id]); const [images] = await connection.execute('SELECT * FROM vehicle_images WHERE id=? AND vehicle_id=? FOR UPDATE', [imageId, id]); const current = images[0]; if (!current)
    throw new HttpError(404, 'Image introuvable'); await connection.execute('DELETE FROM vehicle_images WHERE id=?', [imageId]); if (current.is_primary)
    await connection.execute('UPDATE vehicle_images SET is_primary=TRUE WHERE vehicle_id=? ORDER BY sort_order,id LIMIT 1', [id]); return current; }); for (const file of new Set([image.file_path, image.thumbnail_path].filter(Boolean)))
    await deleteVehicleImageFile(file, { vehicleId: id, imageId }); emitToAgency(String(vehicle.agency_id), 'vehicles:image-added', { vehicleId: id }); response.json({ success: true }); }));
