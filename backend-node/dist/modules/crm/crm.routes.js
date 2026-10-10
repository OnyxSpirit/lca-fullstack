import { Router } from 'express';
import { execute, query, transaction } from '../../config/database.js';
import { requireAnyPermission, requirePermission } from '../../middleware/require-permission.js';
import { assertPermission } from '../rbac/rbac.service.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
import { notifyCrm } from './crm.notifications.js';
import { listCrmTeamMembers, resolveLeadAssignee, validateLeadAssignee } from './crm-assignment.js';
import { publishCrmLeadUpdated } from './crm.realtime.js';
import { CRM_LEAD_OWNER_SQL, crmLeadAgencySql, crmLeadScope } from './crm-visibility.js';
import { pageMeta, pageRequest, paged } from '../../shared/pagination.js';
import { getDefaultAppointmentDuration } from '../settings/setting-resolver.js';
export { crmLeadScope } from './crm-visibility.js';
export const crmRouter = Router();
const stages = ['new', 'contacted', 'qualified', 'appointment', 'test_drive', 'offer', 'negotiation', 'won', 'lost'];
export const CRM_STAGE_TRANSITIONS = {
    new: ['contacted', 'lost'],
    contacted: ['qualified', 'lost'],
    qualified: ['lost'],
    appointment: ['lost'],
    test_drive: ['lost'],
    offer: ['negotiation', 'lost'],
    negotiation: ['lost'],
    won: [],
    lost: [],
};
export const isCrmStageTransitionAllowed = (source, target) => CRM_STAGE_TRANSITIONS[source]?.includes(target) ?? false;
const activityTypes = ['call', 'email', 'task', 'appointment', 'test_drive', 'note', 'other'];
const activityStatuses = ['planned', 'completed', 'cancelled'];
const leadSources = ['Passage Showroom', 'Web', 'Téléphone', 'LeBonCoin', 'Parrainage', 'Campagne Marketing'];
const priorities = ['low', 'medium', 'high', 'urgent'];
const leadAgencySql = crmLeadAgencySql();
const leadSelect = `SELECT l.id lead_id,o.id opportunity_id,l.customer_id,l.first_name,l.last_name,l.company_name,l.email,l.phone,l.source,l.status lead_status,l.priority,l.assigned_user_id,l.created_by,o.title,o.stage,o.expected_value,o.probability,o.expected_close_date,o.lost_reason,o.notes,l.created_at,l.updated_at,CONCAT_WS(' ',u.first_name,u.last_name) assigned_user_name,CONCAT_WS(' ',creator.first_name,creator.last_name) created_by_name,${leadAgencySql} agency_id,a.name agency_name,EXISTS(SELECT 1 FROM follow_ups f JOIN activities act ON act.id=f.activity_id WHERE f.lead_id=l.id AND f.opportunity_id=o.id AND act.type='appointment' AND f.status IN('pending','completed')) has_valid_appointment,(SELECT td.status FROM showroom_test_drives td WHERE td.lead_id=l.id AND td.status<>'cancelled' ORDER BY td.id DESC LIMIT 1) test_drive_status,(SELECT td.returned_at FROM showroom_test_drives td WHERE td.lead_id=l.id AND td.status<>'cancelled' ORDER BY td.id DESC LIMIT 1) test_drive_returned_at FROM leads l JOIN opportunities o ON o.lead_id=l.id LEFT JOIN users u ON u.id=${CRM_LEAD_OWNER_SQL} LEFT JOIN users creator ON creator.id=l.created_by LEFT JOIN agencies a ON a.id=${leadAgencySql}`;
const mapLead = (row) => ({ id: String(row.lead_id), opportunityId: String(row.opportunity_id), customerId: row.customer_id == null ? null : String(row.customer_id), firstName: row.first_name ?? '', lastName: row.last_name ?? '', companyName: row.company_name ?? '', email: row.email ?? '', phone: row.phone ?? '', source: row.source ?? '', leadStatus: row.lead_status, priority: row.priority, assignedUserId: row.assigned_user_id == null ? null : String(row.assigned_user_id), assignedUserName: row.assigned_user_name ?? '', createdById: row.created_by == null ? null : String(row.created_by), createdByName: row.created_by_name ?? '', agencyId: row.agency_id == null ? null : String(row.agency_id), agencyName: row.agency_name ?? '', title: row.title, stage: row.stage, expectedValue: row.expected_value, probability: row.probability, expectedCloseDate: row.expected_close_date, lostReason: row.lost_reason, notes: row.notes ?? '', canStartTestDrive: row.stage === 'appointment' && Boolean(row.has_valid_appointment), testDriveStatus: row.test_drive_status ?? null, testDriveReturnedAt: row.test_drive_returned_at ?? null, canCreateQuotation: row.stage === 'test_drive' && row.test_drive_status === 'completed' && Boolean(row.test_drive_returned_at), createdAt: row.created_at, updatedAt: row.updated_at });
const text = (value, name, max = 255, required = false) => { if (value == null || value === '') {
    if (required)
        throw new HttpError(400, `${name} est requis`);
    return null;
} if (typeof value !== 'string')
    throw new HttpError(400, `${name} doit être une chaîne`); const result = value.trim(); if (!result && required)
    throw new HttpError(400, `${name} est requis`); if (result.length > max)
    throw new HttpError(400, `${name} est trop long`); return result || null; };
const numberValue = (value, name, min, max) => { if (value == null || value === '')
    return null; const result = Number(value); if (!Number.isFinite(result) || result < min || result > max)
    throw new HttpError(400, `${name} est invalide`); return result; };
const validEmail = (value) => { if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new HttpError(400, "L’adresse e-mail n’est pas valide."); return value; };
const validPhone = (value) => { if (value) {
    const digits = value.replace(/\D/g, '');
    if (!/^[+\d\s().-]+$/.test(value) || digits.length < 6 || digits.length > 15)
        throw new HttpError(400, "Le numéro de téléphone n’est pas valide.");
} return value; };
const leadStatusForStage = (stage) => stage === 'won' ? 'converted' : stage === 'lost' ? 'lost' : ['new', 'contacted', 'qualified'].includes(stage) ? stage : 'qualified';
const dateValue = (value, name) => { if (value == null || value === '')
    return null; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
    throw new HttpError(400, `${name} doit être au format AAAA-MM-JJ`); return value; };
const routeId = (value) => { const id = Array.isArray(value) ? value[0] : value; if (!id || !/^\d+$/.test(id))
    throw new HttpError(400, 'Identifiant invalide'); return id; };
async function accessibleLead(id, request, permission = 'crm.prospect.view') { const scoped = crmLeadScope(request, permission); const [row] = await query(`${leadSelect} WHERE l.id=? AND ${scoped.sql}`, [id, ...scoped.params]); if (!row)
    throw new HttpError(404, 'Prospect introuvable'); return row; }
async function leadById(id) { const [row] = await query(`${leadSelect} WHERE l.id=?`, [id]); if (!row)
    throw new HttpError(404, 'Prospect introuvable'); return row; }
async function assertLeadPermissionScope(request, permission, lead) { const granted = await assertPermission(request, permission); if (granted === 'GLOBAL')
    return; if (granted === 'OWN') {
    if (String(lead.assigned_user_id ?? '') === request.user.sub)
        return;
    throw new HttpError(403, `Prospect hors du scope OWN de ${permission}`);
} const actorAgency = String(request.user.agencyId ?? ''), targetAgency = String(lead.agency_id ?? ''); if (granted === 'AGENCY') {
    if (actorAgency === targetAgency)
        return;
    throw new HttpError(403, `Prospect hors du scope AGENCY de ${permission}`);
} if (granted === 'CONCESSION') {
    const [match] = await query('SELECT target.id FROM agencies target JOIN agencies actor ON actor.concession_id=target.concession_id WHERE actor.id=? AND target.id=?', [actorAgency, targetAgency]);
    if (match)
        return;
    throw new HttpError(403, `Prospect hors du scope CONCESSION de ${permission}`);
} throw new HttpError(403, `Scope invalide pour ${permission}`); }
crmRouter.get('/crm/team-members', requirePermission('crm.prospect.assign'), asyncHandler(async (request, response) => response.json(await listCrmTeamMembers(request))));
crmRouter.get('/leads/duplicates', requirePermission('crm.prospect.view'), asyncHandler(async (request, response) => {
    const scoped = crmLeadScope(request, 'crm.prospect.view', leadAgencySql);
    const email = typeof request.query.email === 'string' ? request.query.email.trim().toLowerCase() : '';
    const phone = typeof request.query.phone === 'string' ? request.query.phone.replace(/\D/g, '') : '';
    if (!email && phone.length < 6)
        return response.json([]);
    const rows = await query(`SELECT l.id,l.first_name,l.last_name,l.company_name,(?<>'' AND LOWER(TRIM(l.email))=?) email_match,(?<>'' AND REGEXP_REPLACE(l.phone,'[^0-9]','')=?) phone_match FROM leads l JOIN opportunities o ON o.lead_id=l.id LEFT JOIN users u ON u.id=${CRM_LEAD_OWNER_SQL} LEFT JOIN users creator ON creator.id=l.created_by WHERE ${scoped.sql} AND ((?<>'' AND LOWER(TRIM(l.email))=?) OR (?<>'' AND REGEXP_REPLACE(l.phone,'[^0-9]','')=?)) ORDER BY l.updated_at DESC,l.id DESC LIMIT 10`, [email, email, phone, phone, ...scoped.params, email, email, phone, phone]);
    response.json(rows.map(row => ({ id: String(row.id), displayName: row.company_name || [row.first_name, row.last_name].filter(Boolean).join(' '), emailMatch: Boolean(row.email_match), phoneMatch: Boolean(row.phone_match) })));
}));
crmRouter.get('/leads', requirePermission('crm.prospect.view'), asyncHandler(async (request, response) => {
    const scoped = crmLeadScope(request, 'crm.prospect.view', leadAgencySql, true);
    const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
    const term = `%${search}%`;
    const normalizedPhone = search.replace(/[^\d+]/g, '');
    const phoneTerm = `%${normalizedPhone}%`;
    const stage = typeof request.query.stage === 'string' ? request.query.stage : null;
    if (stage && !stages.includes(stage))
        throw new HttpError(400, 'Étape CRM invalide');
    const priority = typeof request.query.priority === 'string' ? request.query.priority : null;
    if (priority && !priorities.includes(priority))
        throw new HttpError(400, 'Priorité CRM invalide');
    const where = `${scoped.sql} AND (?='' OR CAST(l.id AS CHAR) LIKE ? OR l.first_name LIKE ? OR l.last_name LIKE ? OR l.company_name LIKE ? OR l.email LIKE ? OR o.title LIKE ? OR (?<>'' AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(l.phone,' ',''),'-',''),'.',''),'(',''),')','') LIKE ?)) AND (? IS NULL OR o.stage=?) AND (? IS NULL OR l.priority=?)`, params = [...scoped.params, search, term, term, term, term, term, term, normalizedPhone, phoneTerm, stage, stage, priority, priority], paginationRequested = request.query.page != null || request.query.pageSize != null;
    if (!paginationRequested) {
        const rows = await query(`${leadSelect} WHERE ${where} ORDER BY l.updated_at DESC,l.id DESC LIMIT 200`, params);
        response.json(rows.map(mapLead));
        return;
    }
    const summaryRows = await query(`SELECT o.stage,COUNT(*) count,COALESCE(SUM(o.expected_value),0) budget FROM leads l JOIN opportunities o ON o.lead_id=l.id LEFT JOIN users u ON u.id=${CRM_LEAD_OWNER_SQL} LEFT JOIN users creator ON creator.id=l.created_by WHERE ${where} GROUP BY o.stage`, params), total = summaryRows.reduce((sum, row) => sum + Number(row.count), 0), meta = pageMeta(total, pageRequest(request.query));
    const rows = await query(`${leadSelect} WHERE ${where} ORDER BY l.updated_at DESC,l.id DESC LIMIT ? OFFSET ?`, [...params, meta.pageSize, meta.offset]), stageSummary = Object.fromEntries(stages.map(value => [value, { count: 0, budget: 0 }]));
    for (const row of summaryRows)
        if (stageSummary[row.stage])
            stageSummary[row.stage] = { count: Number(row.count), budget: Number(row.budget) };
    response.json(paged(rows.map(mapLead), total, meta, { stageSummary }));
}));
crmRouter.get('/leads/:id', requirePermission('crm.prospect.view'), asyncHandler(async (request, response) => { response.json(mapLead(await accessibleLead(routeId(request.params.id), request))); }));
crmRouter.post('/leads', requirePermission('crm.prospect.create'), asyncHandler(async (request, response) => {
    const body = request.body;
    const title = text(body.title, 'title', 200, true);
    const firstName = text(body.firstName, 'firstName', 100);
    const lastName = text(body.lastName, 'lastName', 100);
    const companyName = text(body.companyName, 'companyName', 200);
    const email = validEmail(text(body.email, 'email', 190));
    const phone = validPhone(text(body.phone, 'phone', 50));
    const leadType = text(body.prospectType, 'prospectType', 20) ?? (companyName ? 'company' : 'individual');
    if (!['individual', 'company'].includes(leadType))
        throw new HttpError(400, 'Catégorie de prospect invalide');
    if (leadType === 'individual' && (!firstName || !lastName))
        throw new HttpError(400, 'Le prénom et le nom sont obligatoires pour un particulier');
    if (leadType === 'company' && !companyName)
        throw new HttpError(400, 'La raison sociale est obligatoire pour une entreprise');
    if (!phone && !email)
        throw new HttpError(400, 'Un téléphone ou un e-mail est requis');
    if (Object.hasOwn(body, 'stage')) {
        const requestedStage = text(body.stage, 'stage', 30);
        if (requestedStage && !stages.includes(requestedStage))
            throw new HttpError(400, 'Étape CRM invalide');
    }
    const source = text(body.source, 'source', 100);
    if (source && !leadSources.includes(source))
        throw new HttpError(400, 'Source du prospect invalide');
    const priority = text(body.priority, 'priority', 20) ?? 'medium';
    if (!priorities.includes(priority))
        throw new HttpError(400, 'Priorité CRM invalide');
    const stage = text(body.stage, 'stage', 30) ?? 'new';
    if (stage !== 'new')
        throw new HttpError(409, 'Un prospect doit commencer à l’étape Nouveau');
    if (body.assignedUserId != null && body.assignedUserId !== '')
        await assertPermission(request, 'crm.prospect.assign');
    const assigned = await resolveLeadAssignee(body.assignedUserId, request), assignedUserId = assigned.assignedUserId;
    const expectedValue = numberValue(body.expectedValue, 'expectedValue', 0, 9999999999999999);
    const probability = numberValue(body.probability, 'probability', 0, 100);
    const expectedCloseDate = dateValue(body.expectedCloseDate, 'expectedCloseDate');
    const notes = text(body.notes, 'notes', 10000), leadStatus = leadStatusForStage(stage);
    const created = await transaction(async (connection) => { const [lead] = await connection.execute(`INSERT INTO leads(assigned_user_id,created_by,source,status,priority,lead_type,first_name,last_name,company_name,email,phone,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, [assignedUserId, request.user.sub, source, leadStatus, priority, leadType, firstName, lastName, companyName, email, phone, notes]); const [opportunity] = await connection.execute(`INSERT INTO opportunities(lead_id,assigned_user_id,title,stage,expected_value,probability,expected_close_date,notes) VALUES(?,?,?,?,?,?,?,?)`, [lead.insertId, assignedUserId, title, stage, expectedValue, probability, expectedCloseDate, notes]); return { id: String(lead.insertId), opportunityId: String(opportunity.insertId) }; });
    await publishCrmLeadUpdated({ leadId: created.id, changeType: 'created' });
    await notifyCrm({ leadId: created.id, agencyId: assigned.agencyId, assignedUserId, actorUserId: request.user.sub, subject: 'Nouveau prospect', message: assignedUserId ? `Le prospect ${[firstName, lastName].filter(Boolean).join(' ') || companyName} vous a été attribué.` : `Le prospect ${[firstName, lastName].filter(Boolean).join(' ') || companyName} est à affecter.` });
    response.status(201).json(mapLead(await leadById(created.id)));
}));
crmRouter.patch('/leads/:id', requireAnyPermission(['crm.prospect.update', 'crm.prospect.assign']), asyncHandler(async (request, response) => {
    const leadId = routeId(request.params.id);
    const body = request.body;
    const assignmentOnly = Object.keys(body).length === 1 && Object.hasOwn(body, 'assignedUserId');
    if (assignmentOnly)
        await assertPermission(request, 'crm.prospect.assign');
    else
        await assertPermission(request, 'crm.prospect.update');
    if (Object.hasOwn(body, 'assignedUserId'))
        await assertPermission(request, 'crm.prospect.assign');
    const current = await accessibleLead(leadId, request, assignmentOnly ? 'crm.prospect.assign' : 'crm.prospect.update');
    const leadFields = { firstName: 'first_name', lastName: 'last_name', companyName: 'company_name', email: 'email', phone: 'phone', source: 'source', priority: 'priority', notes: 'notes' };
    const opportunityFields = { title: 'title', expectedValue: 'expected_value', probability: 'probability', expectedCloseDate: 'expected_close_date' };
    const leadSets = [], leadValues = [], oppSets = [], oppValues = [];
    for (const [key, column] of Object.entries(leadFields))
        if (Object.hasOwn(body, key)) {
            let value = text(body[key], key, key === 'notes' ? 10000 : key === 'companyName' ? 200 : key === 'email' ? 190 : key === 'phone' ? 50 : 100);
            if (key === 'email')
                value = validEmail(value);
            if (key === 'phone')
                value = validPhone(value);
            if (key === 'source' && value && !leadSources.includes(value))
                throw new HttpError(400, 'Source du prospect invalide');
            if (key === 'priority' && !priorities.includes(value))
                throw new HttpError(400, 'Priorité CRM invalide');
            leadSets.push(`${column}=?`);
            leadValues.push(value);
        }
    for (const [key, column] of Object.entries(opportunityFields))
        if (Object.hasOwn(body, key)) {
            const value = key === 'expectedValue' ? numberValue(body[key], key, 0, 9999999999999999) : key === 'probability' ? numberValue(body[key], key, 0, 100) : key === 'expectedCloseDate' ? dateValue(body[key], key) : text(body[key], key, 200, key === 'title');
            oppSets.push(`${column}=?`);
            oppValues.push(value);
        }
    let assignedUserId = current.assigned_user_id == null ? null : String(current.assigned_user_id), agencyId = current.agency_id == null ? null : String(current.agency_id);
    if (Object.hasOwn(body, 'assignedUserId')) {
        assignedUserId = text(body.assignedUserId, 'assignedUserId', 30, true);
        agencyId = (await validateLeadAssignee(assignedUserId, request)).agencyId;
        leadSets.push('assigned_user_id=?');
        leadValues.push(assignedUserId);
        oppSets.push('assigned_user_id=?');
        oppValues.push(assignedUserId);
    }
    if (!leadSets.length && !oppSets.length)
        throw new HttpError(400, 'Aucun champ modifiable fourni');
    await transaction(async (connection) => { if (leadSets.length)
        await connection.execute(`UPDATE leads SET ${leadSets.join(',')} WHERE id=?`, [...leadValues, leadId]); if (oppSets.length)
        await connection.execute(`UPDATE opportunities SET ${oppSets.join(',')} WHERE lead_id=?`, [...oppValues, leadId]); const reassigned = assignedUserId !== String(current.assigned_user_id ?? ''); await connection.execute(`INSERT INTO activities(customer_id,lead_id,opportunity_id,assigned_user_id,created_by,type,subject,description,status,completed_at) VALUES(?,?,?,?,?,?,?,?,'completed',NOW())`, [current.customer_id, leadId, current.opportunity_id, assignedUserId, request.user.sub, 'note', reassigned ? 'Réaffectation commerciale' : 'Fiche prospect mise à jour', reassigned ? `Commercial : ${current.assigned_user_id ?? 'non affecté'} → ${assignedUserId}` : `Champs modifiés : ${[...Object.keys(body)].join(', ')}`]); });
    await publishCrmLeadUpdated({ leadId, changeType: 'updated' });
    if (assignedUserId && assignedUserId !== String(current.assigned_user_id ?? ''))
        await notifyCrm({ leadId, agencyId, assignedUserId, actorUserId: request.user.sub, subject: 'Prospect réattribué', message: `Le prospect #${leadId} vous a été attribué.` });
    response.json(mapLead(await leadById(leadId)));
}));
crmRouter.patch('/leads/:id/stage', requirePermission('crm.pipeline.advance'), asyncHandler(async (request, response) => {
    const leadId = routeId(request.params.id);
    const current = await accessibleLead(leadId, request, 'crm.pipeline.advance');
    const stage = text(request.body?.stage, 'stage', 30, true);
    if (!stages.includes(stage))
        throw new HttpError(400, 'Étape CRM invalide');
    const lostReason = text(request.body?.lostReason, 'lostReason', 255);
    if (stage === 'lost' && !lostReason)
        throw new HttpError(400, 'Le motif de perte est obligatoire');
    if (!isCrmStageTransitionAllowed(current.stage, stage))
        throw new HttpError(409, `Transition CRM interdite : ${current.stage} → ${stage}`);
    if (['appointment', 'test_drive', 'offer', 'won'].includes(stage))
        throw new HttpError(409, 'Cette étape doit être produite par son action métier');
    if (stage === 'contacted' && current.stage !== 'new')
        throw new HttpError(409, 'Seul un nouveau prospect peut être marqué contacté');
    if (stage === 'qualified') {
        if (current.stage !== 'contacted')
            throw new HttpError(409, 'Le prospect doit d’abord être contacté');
        if (!current.assigned_user_id || !current.title || (!current.phone && !current.email) || Number(current.expected_value ?? 0) <= 0)
            throw new HttpError(409, 'Qualification impossible : commercial, besoin, coordonnées et budget sont requis');
    }
    if (stage === 'negotiation') {
        if (current.stage !== 'offer')
            throw new HttpError(409, 'Une offre doit précéder la négociation');
        const [quotation] = await query(`SELECT id FROM quotations WHERE opportunity_id=? AND status NOT IN('rejected','expired','cancelled') LIMIT 1`, [current.opportunity_id]);
        if (!quotation)
            throw new HttpError(409, 'Un devis réel est requis pour négocier');
    }
    if (stage === 'lost') {
        await assertPermission(request, 'crm.prospect.lose');
        if (current.stage === 'won')
            throw new HttpError(409, 'Une opportunité gagnée ne peut pas être perdue');
    }
    await transaction(async (connection) => {
        await connection.execute(`UPDATE opportunities SET stage=?,lost_reason=?,lost_at=IF(?='lost',NOW(),NULL) WHERE lead_id=?`, [stage, stage === 'lost' ? lostReason : null, stage, leadId]);
        await connection.execute(`UPDATE leads SET status=? WHERE id=?`, [leadStatusForStage(stage), leadId]);
        if (stage === 'negotiation')
            await connection.execute("UPDATE quotations SET status='negotiation' WHERE opportunity_id=? AND status IN('draft','sent')", [current.opportunity_id]);
        await connection.execute(`INSERT INTO activities(customer_id,lead_id,opportunity_id,assigned_user_id,created_by,type,subject,description,status,completed_at) VALUES(?,?,?,?,?,?,'Étape CRM mise à jour',?,'completed',NOW())`, [current.customer_id, leadId, current.opportunity_id, current.assigned_user_id, request.user.sub, 'note', `Étape : ${current.stage} → ${stage}${lostReason ? ` — Motif : ${lostReason}` : ''}`]);
    });
    await publishCrmLeadUpdated({ leadId, changeType: 'stage' });
    await notifyCrm({ leadId, agencyId: current.agency_id == null ? null : String(current.agency_id), assignedUserId: current.assigned_user_id == null ? null : String(current.assigned_user_id), actorUserId: request.user.sub, subject: 'Étape CRM mise à jour', message: `Le prospect #${leadId} est maintenant à l’étape ${stage}.` });
    response.json(mapLead(await accessibleLead(leadId, request, 'crm.pipeline.advance')));
}));
crmRouter.post('/leads/:id/appointments', requirePermission('crm.appointment.create'), asyncHandler(async (request, response) => {
    const leadId = routeId(request.params.id), current = await accessibleLead(leadId, request, 'crm.appointment.create');
    if (!['qualified', 'appointment'].includes(current.stage))
        throw new HttpError(409, 'Le prospect doit être qualifié avant de planifier un rendez-vous');
    if (!current.assigned_user_id)
        throw new HttpError(409, 'Un commercial doit être affecté');
    const scheduledAt = text(request.body?.scheduledAt, 'scheduledAt', 30, true), parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime()) || parsed <= new Date())
        throw new HttpError(400, 'La date du rendez-vous doit être future');
    const configured = await getDefaultAppointmentDuration(String(current.agency_id)), duration = numberValue(request.body?.durationMinutes, 'durationMinutes', 1, 1440) ?? configured;
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440)
        throw new HttpError(400, 'La durée du rendez-vous est invalide');
    const endsAt = new Date(parsed.getTime() + duration * 60000), subject = text(request.body?.subject, 'subject', 255) ?? 'Rendez-vous commercial', description = text(request.body?.description, 'description', 10000), override = Boolean(request.body?.overrideConflict), overrideReason = text(request.body?.overrideReason, 'overrideReason', 1000);
    if (override)
        await assertLeadPermissionScope(request, 'crm.appointment.override_conflict', current);
    const activityId = await transaction(async (connection) => { await connection.execute('SELECT id FROM users WHERE id=? FOR UPDATE', [current.assigned_user_id]); const [conflicts] = await connection.execute(`SELECT f.id,f.activity_id,f.scheduled_at,f.duration_minutes FROM follow_ups f WHERE f.assigned_user_id=? AND f.status='pending' AND f.scheduled_at<? AND DATE_ADD(f.scheduled_at,INTERVAL COALESCE(f.duration_minutes,30) MINUTE)>? FOR UPDATE`, [current.assigned_user_id, endsAt, parsed]); if (conflicts.length) {
        if (!override)
            throw new HttpError(409, 'Ce commercial a déjà un rendez-vous sur ce créneau', { code: 'CRM_APPOINTMENT_CONFLICT', conflicts: conflicts.map(row => ({ id: String(row.id), scheduledAt: row.scheduled_at, durationMinutes: Number(row.duration_minutes ?? 30) })) });
        await assertPermission(request, 'crm.appointment.override_conflict');
        if (!overrideReason)
            throw new HttpError(400, 'La justification du chevauchement est obligatoire');
    } const [result] = await connection.execute(`INSERT INTO activities(customer_id,lead_id,opportunity_id,assigned_user_id,created_by,type,subject,description,status,due_at) VALUES(?,?,?,?,?,?,?,?,'planned',?)`, [current.customer_id, leadId, current.opportunity_id, current.assigned_user_id, request.user.sub, 'appointment', subject, `${description ?? ''}${description ? ' — ' : ''}Étape : ${current.stage} → appointment`, parsed]); await connection.execute(`INSERT INTO follow_ups(customer_id,lead_id,opportunity_id,assigned_user_id,activity_id,scheduled_at,duration_minutes,status,notes,conflict_override_reason,conflict_override_by,conflict_override_at,conflict_snapshot) VALUES(?,?,?,?,?,?,?,'pending',?,?,?,?,?)`, [current.customer_id, leadId, current.opportunity_id, current.assigned_user_id, result.insertId, parsed, duration, description, conflicts.length ? overrideReason : null, conflicts.length ? request.user.sub : null, conflicts.length ? new Date() : null, conflicts.length ? JSON.stringify(conflicts.map(row => String(row.id))) : null]); await connection.execute("UPDATE opportunities SET stage='appointment' WHERE id=?", [current.opportunity_id]); return String(result.insertId); });
    await publishCrmLeadUpdated({ leadId, changeType: 'appointment' });
    await notifyCrm({ leadId, agencyId: current.agency_id == null ? null : String(current.agency_id), assignedUserId: current.assigned_user_id == null ? null : String(current.assigned_user_id), actorUserId: request.user.sub, subject: 'Rendez-vous commercial planifié', message: `Un rendez-vous a été planifié pour le prospect #${leadId}.` });
    response.status(201).json({ id: activityId, leadId, stage: 'appointment', scheduledAt: parsed.toISOString(), durationMinutes: duration, endsAt: endsAt.toISOString() });
}));
crmRouter.get('/leads/:id/activities', requirePermission('crm.activity.view'), asyncHandler(async (request, response) => { const leadId = routeId(request.params.id); await accessibleLead(leadId, request, 'crm.activity.view'); const rows = await query(`SELECT a.id,a.customer_id,a.lead_id,a.opportunity_id,a.assigned_user_id,a.created_by,a.type,a.subject,a.description,a.status,a.due_at,a.completed_at,a.created_at,CONCAT_WS(' ',u.first_name,u.last_name) assigned_user_name,CONCAT_WS(' ',author.first_name,author.last_name) created_by_name FROM activities a LEFT JOIN users u ON u.id=a.assigned_user_id LEFT JOIN users author ON author.id=a.created_by WHERE a.lead_id=? ORDER BY a.created_at DESC LIMIT 200`, [leadId]); response.json(rows.map(row => ({ id: String(row.id), customerId: row.customer_id == null ? null : String(row.customer_id), leadId: String(row.lead_id), opportunityId: row.opportunity_id == null ? null : String(row.opportunity_id), assignedUserId: row.assigned_user_id == null ? null : String(row.assigned_user_id), assignedUserName: row.assigned_user_name ?? '', createdById: row.created_by == null ? null : String(row.created_by), createdByName: row.created_by_name ?? '', type: row.type, subject: row.subject, description: row.description ?? '', status: row.status, dueAt: row.due_at, completedAt: row.completed_at, createdAt: row.created_at }))); }));
crmRouter.post('/activities', requirePermission('crm.activity.create'), asyncHandler(async (request, response) => { const body = request.body; const leadId = text(body.leadId, 'leadId', 30, true); const lead = await accessibleLead(leadId, request, 'crm.activity.create'); const type = text(body.type, 'type', 30, true); if (!activityTypes.includes(type))
    throw new HttpError(400, "Type d'activité invalide"); const status = text(body.status, 'status', 30) ?? 'completed'; if (!activityStatuses.includes(status))
    throw new HttpError(400, "Statut d'activité invalide"); const subject = text(body.subject, 'subject', 255, true); const description = text(body.description, 'description', 10000); const dueAt = body.dueAt == null || body.dueAt === '' ? null : new Date(String(body.dueAt)); if (dueAt && Number.isNaN(dueAt.getTime()))
    throw new HttpError(400, 'dueAt est invalide'); const result = await execute(`INSERT INTO activities(customer_id,lead_id,opportunity_id,assigned_user_id,created_by,type,subject,description,status,due_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, [lead.customer_id ?? null, leadId, lead.opportunity_id, lead.assigned_user_id, request.user.sub, type, subject, description, status, dueAt, status === 'completed' ? new Date() : null]); await publishCrmLeadUpdated({ leadId, changeType: 'activity' }); await notifyCrm({ leadId, agencyId: lead.agency_id == null ? null : String(lead.agency_id), assignedUserId: lead.assigned_user_id == null ? null : String(lead.assigned_user_id), actorUserId: request.user.sub, subject: 'Nouvelle activité CRM', message: `${subject} a été ajouté au prospect #${leadId}.` }); response.status(201).json({ id: String(result.insertId) }); }));
