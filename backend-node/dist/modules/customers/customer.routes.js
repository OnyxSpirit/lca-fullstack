import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { execute, query, transaction } from '../../config/database.js';
import { authorize, unrestricted } from '../../middleware/authorize.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
export const customerRouter = Router();
const READ = ['SUPER_ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'SALES_AGENT', 'RECEPTIONIST', 'SERVICE_MANAGER', 'SERVICE_ADVISOR', 'WORKSHOP_MANAGER', 'TECHNICIAN', 'DELIVERY_MANAGER', 'ACCOUNTANT'];
const WRITE = ['SUPER_ADMIN', 'DIRECTOR', 'SALES_MANAGER', 'SALES_AGENT', 'RECEPTIONIST', 'SERVICE_MANAGER', 'SERVICE_ADVISOR'];
const classifications = ['occasional', 'regular', 'vip', 'at_risk'];
const customerTypes = ['individual', 'company'];
const civilities = ['M.', 'Mme', 'Société'];
const routeId = (value) => { const id = Array.isArray(value) ? value[0] : value; if (!id || !/^\d+$/.test(id))
    throw new HttpError(400, 'Identifiant invalide'); return id; };
const text = (value, name, max = 255, required = false) => { if (value == null || value === '') {
    if (required)
        throw new HttpError(400, `${name} est requis`);
    return null;
} if (typeof value !== 'string')
    throw new HttpError(400, `${name} doit être une chaîne`); const result = value.trim(); if (!result && required)
    throw new HttpError(400, `${name} est requis`); if (result.length > max)
    throw new HttpError(400, `${name} est trop long`); return result || null; };
const numeric = (value, name) => { if (value == null || value === '')
    return null; const result = Number(value); if (!Number.isFinite(result) || result < 0 || result > 100)
    throw new HttpError(400, `${name} est invalide`); return result; };
const normalizePhone = (value) => value?.replace(/\D/g, '') ?? '';
const hasRole = (request, roles) => Boolean(request.user?.roles.some(role => roles.includes(role)));
const customerSelect = `SELECT c.*,a.name agency_name,CONCAT_WS(' ',assigned.first_name,assigned.last_name) assigned_user_name,CONCAT_WS(' ',creator.first_name,creator.last_name) created_by_name,COALESCE((SELECT SUM(s.total) FROM sales s WHERE s.customer_id=c.id AND s.status<>'cancelled'),0) total_revenue,COALESCE((SELECT SUM(i.balance_due) FROM invoices i WHERE i.customer_id=c.id AND i.status NOT IN ('paid','cancelled')),0) open_balance FROM customers c JOIN agencies a ON a.id=c.agency_id LEFT JOIN users assigned ON assigned.id=c.assigned_user_id LEFT JOIN users creator ON creator.id=c.created_by`;
const mapCustomer = (row) => ({ id: String(row.id), customerCode: row.customer_code, customerType: row.customer_type, civility: row.civility, firstName: row.first_name ?? '', lastName: row.last_name ?? '', companyName: row.company_name ?? '', email: row.email ?? '', phone: row.phone ?? '', secondaryPhone: row.secondary_phone ?? '', address: row.address ?? '', postalCode: row.postal_code ?? '', city: row.city ?? '', country: row.country ?? '', taxIdentifier: row.tax_identifier ?? '', source: row.source ?? '', segment: row.segment ?? '', score: Number(row.score ?? 0), classification: row.classification, notes: row.notes ?? '', agencyId: String(row.agency_id), agencyName: row.agency_name, assignedUserId: row.assigned_user_id == null ? null : String(row.assigned_user_id), assignedUserName: row.assigned_user_name ?? '', createdById: row.created_by == null ? null : String(row.created_by), createdByName: row.created_by_name ?? '', totalRevenue: Number(row.total_revenue ?? 0), openBalance: Number(row.open_balance ?? 0), createdAt: row.created_at, updatedAt: row.updated_at });
function scope(request, alias = 'c') {
    const requestedAgency = typeof request.query.agencyId === 'string' ? request.query.agencyId : null;
    const requestedCommercial = typeof request.query.commercialId === 'string' ? request.query.commercialId : null;
    if (unrestricted(request))
        return { sql: `(? IS NULL OR ${alias}.agency_id=?) AND (? IS NULL OR ${alias}.assigned_user_id=?)`, params: [requestedAgency, requestedAgency, requestedCommercial, requestedCommercial] };
    if (!request.user?.agencyId)
        throw new HttpError(403, 'Aucune agence associée à cet utilisateur');
    if (hasRole(request, ['SALES_AGENT']))
        return { sql: `${alias}.agency_id=? AND ${alias}.assigned_user_id=?`, params: [request.user.agencyId, request.user.sub] };
    return { sql: `${alias}.agency_id=? AND (? IS NULL OR ${alias}.assigned_user_id=?)`, params: [request.user.agencyId, requestedCommercial, requestedCommercial] };
}
async function accessibleCustomer(id, request) { const scoped = scope(request); const [row] = await query(`${customerSelect} WHERE c.id=? AND ${scoped.sql}`, [id, ...scoped.params]); if (!row)
    throw new HttpError(404, 'Client introuvable'); return row; }
async function resolveAgency(request, body) { const agencyId = unrestricted(request) ? text(body.agencyId, 'agencyId', 30) ?? request.user?.agencyId : request.user?.agencyId; if (!agencyId)
    throw new HttpError(400, 'agencyId est requis'); const [agency] = await query('SELECT id FROM agencies WHERE id=? AND is_active=TRUE', [agencyId]); if (!agency)
    throw new HttpError(400, 'Agence introuvable ou inactive'); return String(agencyId); }
async function validateAssignee(userId, agencyId, request) { if (!userId)
    return; if (hasRole(request, ['SALES_AGENT']) && userId !== request.user?.sub)
    throw new HttpError(403, 'Un commercial ne peut attribuer le client à un autre agent'); const [user] = await query('SELECT id,agency_id FROM users WHERE id=? AND is_active=TRUE', [userId]); if (!user)
    throw new HttpError(400, 'Conseiller introuvable ou inactif'); if (String(user.agency_id) !== agencyId)
    throw new HttpError(403, 'Le conseiller appartient à une autre agence'); }
async function duplicates(email, phone, excludeId = null) { const normalized = normalizePhone(phone); return query(`SELECT id,customer_code,first_name,last_name,company_name,email,phone FROM customers WHERE (? IS NULL OR id<>?) AND ((?<>'' AND LOWER(email)=LOWER(?)) OR (?<>'' AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'.',''),'(',''),')','') LIKE ?)) LIMIT 20`, [excludeId, excludeId, email ?? '', email ?? '', normalized, `%${normalized}%`]); }
customerRouter.get('/customers/duplicates', authorize(...READ), asyncHandler(async (request, response) => { const email = typeof request.query.email === 'string' ? request.query.email.trim() : null; const phone = typeof request.query.phone === 'string' ? request.query.phone.trim() : null; response.json(await duplicates(email, phone)); }));
customerRouter.get('/customers', authorize(...READ), asyncHandler(async (request, response) => { const scoped = scope(request); const search = typeof request.query.search === 'string' ? request.query.search.trim() : ''; const term = `%${search}%`; const phoneTerm = `%${normalizePhone(search)}%`; const type = typeof request.query.type === 'string' ? request.query.type : null; if (type && !customerTypes.includes(type))
    throw new HttpError(400, 'Type de client invalide'); const classification = typeof request.query.classification === 'string' ? request.query.classification : null; if (classification && !classifications.includes(classification))
    throw new HttpError(400, 'Classification invalide'); const rows = await query(`${customerSelect} WHERE ${scoped.sql} AND (?='' OR c.customer_code LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.company_name LIKE ? OR c.email LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.phone,' ',''),'-',''),'.',''),'(',''),')','') LIKE ?) AND (? IS NULL OR c.customer_type=?) AND (? IS NULL OR c.classification=?) ORDER BY c.updated_at DESC LIMIT 200`, [...scoped.params, search, term, term, term, term, term, phoneTerm, type, type, classification, classification]); response.json(rows.map(mapCustomer)); }));
customerRouter.get('/customers/:id', authorize(...READ), asyncHandler(async (request, response) => response.json(mapCustomer(await accessibleCustomer(routeId(request.params.id), request)))));
customerRouter.post('/customers', authorize(...WRITE), asyncHandler(async (request, response) => { const body = request.body; const customerType = text(body.customerType, 'customerType', 20) ?? 'individual'; if (!customerTypes.includes(customerType))
    throw new HttpError(400, 'Type de client invalide'); const firstName = text(body.firstName, 'firstName', 100), lastName = text(body.lastName, 'lastName', 100), companyName = text(body.companyName, 'companyName', 200); if (customerType === 'individual' && !lastName)
    throw new HttpError(400, 'Le nom est requis pour un particulier'); if (customerType === 'company' && !companyName)
    throw new HttpError(400, 'La raison sociale est requise pour une entreprise'); const email = text(body.email, 'email', 190), phone = text(body.phone, 'phone', 50); if (!email && !phone)
    throw new HttpError(400, 'Un téléphone ou un e-mail est requis'); const found = await duplicates(email, phone); if (found.length)
    throw new HttpError(409, 'Un client avec le même téléphone ou e-mail existe déjà', { duplicates: found }); const agencyId = await resolveAgency(request, body); const assignedUserId = text(body.assignedUserId, 'assignedUserId', 30) ?? request.user.sub; await validateAssignee(assignedUserId, agencyId, request); const civility = text(body.civility, 'civility', 20) ?? (customerType === 'company' ? 'Société' : null); if (civility && !civilities.includes(civility))
    throw new HttpError(400, 'Civilité invalide'); const classification = text(body.classification, 'classification', 30) ?? 'occasional'; if (!classifications.includes(classification))
    throw new HttpError(400, 'Classification invalide'); const score = numeric(body.score, 'score'); const created = await transaction(async (connection) => { const temporary = `TMP-${randomUUID()}`; const [result] = await connection.execute(`INSERT INTO customers(customer_code,customer_type,civility,agency_id,first_name,last_name,company_name,email,phone,secondary_phone,address,postal_code,city,country,tax_identifier,source,segment,score,classification,notes,assigned_user_id,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [temporary, customerType, civility, agencyId, firstName, lastName, companyName, email, phone, text(body.secondaryPhone, 'secondaryPhone', 50), text(body.address, 'address', 1000), text(body.postalCode, 'postalCode', 30), text(body.city, 'city', 100), text(body.country, 'country', 100) ?? 'Congo', text(body.taxIdentifier, 'taxIdentifier', 100), text(body.source, 'source', 100), text(body.segment, 'segment', 100), score, classification, text(body.notes, 'notes', 10000), assignedUserId, request.user.sub]); const customerCode = `CLI-${String(result.insertId).padStart(6, '0')}`; await connection.execute('UPDATE customers SET customer_code=? WHERE id=?', [customerCode, result.insertId]); return String(result.insertId); }); response.status(201).json(mapCustomer(await accessibleCustomer(created, request))); }));
customerRouter.patch('/customers/:id', authorize(...WRITE), asyncHandler(async (request, response) => { const id = routeId(request.params.id); const current = await accessibleCustomer(id, request); const body = request.body; const columns = { customerType: 'customer_type', civility: 'civility', firstName: 'first_name', lastName: 'last_name', companyName: 'company_name', email: 'email', phone: 'phone', secondaryPhone: 'secondary_phone', address: 'address', postalCode: 'postal_code', city: 'city', country: 'country', taxIdentifier: 'tax_identifier', source: 'source', segment: 'segment', classification: 'classification', notes: 'notes' }; const sets = [], values = []; for (const [key, column] of Object.entries(columns))
    if (Object.hasOwn(body, key)) {
        const value = text(body[key], key, key === 'notes' || key === 'address' ? 10000 : key === 'companyName' ? 200 : key === 'email' ? 190 : 100);
        if (key === 'customerType' && !customerTypes.includes(value))
            throw new HttpError(400, 'Type de client invalide');
        if (key === 'civility' && value && !civilities.includes(value))
            throw new HttpError(400, 'Civilité invalide');
        if (key === 'classification' && !classifications.includes(value))
            throw new HttpError(400, 'Classification invalide');
        sets.push(`${column}=?`);
        values.push(value);
    } if (Object.hasOwn(body, 'score')) {
    sets.push('score=?');
    values.push(numeric(body.score, 'score'));
} if (Object.hasOwn(body, 'assignedUserId')) {
    const assigned = text(body.assignedUserId, 'assignedUserId', 30);
    await validateAssignee(assigned, String(current.agency_id), request);
    sets.push('assigned_user_id=?');
    values.push(assigned);
} if (!sets.length)
    throw new HttpError(400, 'Aucun champ modifiable fourni'); const email = Object.hasOwn(body, 'email') ? text(body.email, 'email', 190) : current.email; const phone = Object.hasOwn(body, 'phone') ? text(body.phone, 'phone', 50) : current.phone; const found = await duplicates(email, phone, id); if (found.length)
    throw new HttpError(409, 'Un client avec le même téléphone ou e-mail existe déjà', { duplicates: found }); await execute(`UPDATE customers SET ${sets.join(',')} WHERE id=?`, [...values, id]); response.json(mapCustomer(await accessibleCustomer(id, request))); }));
customerRouter.get('/customers/:id/contacts', authorize(...READ), asyncHandler(async (request, response) => { const id = routeId(request.params.id); await accessibleCustomer(id, request); response.json(await query('SELECT id,customer_id,first_name,last_name,role_title,email,phone,is_primary,created_at FROM customer_contacts WHERE customer_id=? ORDER BY is_primary DESC,last_name,first_name', [id])); }));
customerRouter.post('/customers/:id/contacts', authorize(...WRITE), asyncHandler(async (request, response) => { const id = routeId(request.params.id); await accessibleCustomer(id, request); const body = request.body; const result = await execute('INSERT INTO customer_contacts(customer_id,first_name,last_name,role_title,email,phone,is_primary) VALUES(?,?,?,?,?,?,?)', [id, text(body.firstName, 'firstName', 100, true), text(body.lastName, 'lastName', 100, true), text(body.roleTitle, 'roleTitle', 120), text(body.email, 'email', 190), text(body.phone, 'phone', 50), Boolean(body.isPrimary)]); response.status(201).json({ id: String(result.insertId) }); }));
customerRouter.patch('/customers/:id/contacts/:contactId', authorize(...WRITE), asyncHandler(async (request, response) => { const id = routeId(request.params.id), contactId = routeId(request.params.contactId); await accessibleCustomer(id, request); const body = request.body; const fields = { firstName: 'first_name', lastName: 'last_name', roleTitle: 'role_title', email: 'email', phone: 'phone' }; const sets = [], values = []; for (const [key, column] of Object.entries(fields))
    if (Object.hasOwn(body, key)) {
        sets.push(`${column}=?`);
        values.push(text(body[key], key, key === 'email' ? 190 : key === 'roleTitle' ? 120 : 100, key === 'firstName' || key === 'lastName'));
    } if (Object.hasOwn(body, 'isPrimary')) {
    sets.push('is_primary=?');
    values.push(Boolean(body.isPrimary));
} if (!sets.length)
    throw new HttpError(400, 'Aucun champ modifiable fourni'); const result = await execute(`UPDATE customer_contacts SET ${sets.join(',')} WHERE id=? AND customer_id=?`, [...values, contactId, id]); if (!result.affectedRows)
    throw new HttpError(404, 'Contact introuvable'); response.json({ success: true }); }));
customerRouter.delete('/customers/:id/contacts/:contactId', authorize(...WRITE), asyncHandler(async (request, response) => { const id = routeId(request.params.id), contactId = routeId(request.params.contactId); await accessibleCustomer(id, request); const result = await execute('DELETE FROM customer_contacts WHERE id=? AND customer_id=?', [contactId, id]); if (!result.affectedRows)
    throw new HttpError(404, 'Contact introuvable'); response.json({ success: true }); }));
customerRouter.get('/customers/:id/360', authorize(...READ), asyncHandler(async (request, response) => {
    const id = routeId(request.params.id);
    const customer = await accessibleCustomer(id, request);
    const agencyId = String(customer.agency_id);
    const [contacts, opportunities, vehicles, sales, repairOrders, invoices, timeline] = await Promise.all([
        query('SELECT id,first_name,last_name,role_title,email,phone,is_primary,created_at FROM customer_contacts WHERE customer_id=? ORDER BY is_primary DESC,last_name', [id]),
        query(`SELECT o.id,o.title,o.stage,o.expected_value,o.probability,o.expected_close_date,o.lost_reason,o.created_at FROM opportunities o WHERE o.customer_id=? OR o.lead_id IN(SELECT id FROM leads WHERE customer_id=?) ORDER BY o.updated_at DESC`, [id, id]),
        query(`SELECT DISTINCT v.id,v.vin,v.registration_number,v.year,v.mileage,v.status,b.name brand,m.name model,ve.name version FROM vehicles v JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id WHERE v.agency_id=? AND (EXISTS(SELECT 1 FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.vehicle_id=v.id AND s.customer_id=?) OR EXISTS(SELECT 1 FROM repair_orders ro WHERE ro.vehicle_id=v.id AND ro.customer_id=?)) ORDER BY v.updated_at DESC`, [agencyId, id, id]),
        query(`SELECT s.id,s.sale_number,s.status,s.total,s.balance_due,s.created_at,si.vehicle_id,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label FROM sales s LEFT JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL LEFT JOIN vehicles v ON v.id=si.vehicle_id LEFT JOIN versions ve ON ve.id=v.version_id LEFT JOIN models m ON m.id=ve.model_id LEFT JOIN brands b ON b.id=m.brand_id WHERE s.customer_id=? AND s.agency_id=? ORDER BY s.created_at DESC`, [id, agencyId]),
        query(`SELECT ro.id,ro.order_number,ro.status,ro.complaint,ro.actual_total,ro.created_at,v.id vehicle_id,v.registration_number,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label FROM repair_orders ro JOIN vehicles v ON v.id=ro.vehicle_id JOIN versions ve ON ve.id=v.version_id JOIN models m ON m.id=ve.model_id JOIN brands b ON b.id=m.brand_id WHERE ro.customer_id=? AND ro.agency_id=? ORDER BY ro.created_at DESC`, [id, agencyId]),
        query(`SELECT id,invoice_number,status,issue_date,due_date,total,amount_paid,balance_due,invoice_type,created_at FROM invoices WHERE customer_id=? AND agency_id=? ORDER BY created_at DESC`, [id, agencyId]),
        query(`SELECT * FROM (SELECT 'customer' event_type,c.id reference_id,CONCAT('Création client ',c.customer_code) title,'Fiche client créée' description,c.created_at event_at FROM customers c WHERE c.id=? UNION ALL SELECT 'opportunity',o.id,o.title,CONCAT('Étape ',o.stage),o.created_at FROM opportunities o WHERE o.customer_id=? OR o.lead_id IN(SELECT id FROM leads WHERE customer_id=?) UNION ALL SELECT 'activity',a.id,a.subject,a.description,a.created_at FROM activities a WHERE a.customer_id=? UNION ALL SELECT 'sale',s.id,CONCAT('Vente ',s.sale_number,' — ',s.status),CONCAT(s.total,' XAF'),s.created_at FROM sales s WHERE s.customer_id=? UNION ALL SELECT 'delivery',d.id,CONCAT('Livraison ',d.delivery_number,' — ',d.status),d.customer_notes,d.created_at FROM deliveries d WHERE d.customer_id=? UNION ALL SELECT 'repair_order',ro.id,CONCAT('OR ',ro.order_number,' — ',ro.status),ro.complaint,ro.created_at FROM repair_orders ro WHERE ro.customer_id=? UNION ALL SELECT 'invoice',i.id,CONCAT('Facture ',i.invoice_number,' — ',i.status),CONCAT(i.total,' XAF'),i.created_at FROM invoices i WHERE i.customer_id=? UNION ALL SELECT 'payment',p.id,CONCAT('Paiement ',p.payment_number,' — ',p.status),CONCAT(p.amount,' XAF'),p.payment_date FROM payments p WHERE p.customer_id=? UNION ALL SELECT 'showroom',sv.id,CONCAT('Visite showroom — ',sv.status),sv.reason,sv.arrival_at FROM showroom_visits sv WHERE sv.customer_id=? UNION ALL SELECT 'document',d.id,d.file_name,d.document_type,d.created_at FROM documents d WHERE d.entity_type='customer' AND d.entity_id=? AND d.is_archived=FALSE) events ORDER BY event_at DESC LIMIT 200`, [id, id, id, id, id, id, id, id, id, id, id])
    ]);
    response.json({ customer: mapCustomer(customer), contacts, opportunities: opportunities.map(r => ({ id: String(r.id), title: r.title, stage: r.stage, expectedValue: Number(r.expected_value ?? 0), probability: Number(r.probability ?? 0), expectedCloseDate: r.expected_close_date, lostReason: r.lost_reason, createdAt: r.created_at })), vehicles: vehicles.map(r => ({ id: String(r.id), vin: r.vin, registrationNumber: r.registration_number ?? '', brand: r.brand, model: r.model, version: r.version, year: r.year, mileage: Number(r.mileage ?? 0), status: r.status })), sales: sales.map(r => ({ id: String(r.id), saleNumber: r.sale_number, status: r.status, totalSaleTTC: Number(r.total ?? 0), remainingBalanceTTC: Number(r.balance_due ?? 0), vehicleId: r.vehicle_id == null ? '' : String(r.vehicle_id), vehicleLabel: r.vehicle_label ?? '', createdAt: r.created_at })), repairOrders: repairOrders.map(r => ({ id: String(r.id), orNumber: r.order_number, status: r.status, symptomsReported: r.complaint ?? '', finalTotalTTC: Number(r.actual_total ?? 0), vehicleId: String(r.vehicle_id), vehicleModel: r.vehicle_label, vehiclePlate: r.registration_number ?? '', createdAt: r.created_at })), invoices: invoices.map(r => ({ id: String(r.id), invoiceNumber: r.invoice_number, status: r.status, issueDate: r.issue_date, dueDate: r.due_date, amountTTC: Number(r.total ?? 0), paidAmountTTC: Number(r.amount_paid ?? 0), remainingAmountTTC: Number(r.balance_due ?? 0), type: r.invoice_type, createdAt: r.created_at })), timeline });
}));
