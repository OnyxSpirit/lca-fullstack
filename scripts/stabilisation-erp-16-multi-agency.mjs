import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:3004/api', password = process.env.RECETTE_USER_PASSWORD, adminEmail = process.env.ADMIN_EMAIL, adminPassword = process.env.ADMIN_PASSWORD;
if (!password || !adminEmail || !adminPassword) throw new Error('Variables recette absentes');
const observations = [], checks = [];
async function api(path, { method = 'GET', token, body, expected = [200] } = {}) { const response = await fetch(base + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); const raw = await response.text(); let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw: raw.slice(0, 200) }; } if (!expected.includes(response.status)) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`); return { status: response.status, data }; }
const login = async (email, secret = password) => (await api('/auth/login', { method: 'POST', body: { email, password: secret } })).data;
const actors = {
  admin: await login(adminEmail, adminPassword), partsA2: await login('recette.responsable_pieces.a2@lca-test.cg'),
  commercialA3: await login('recette.commercial@lca-test.cg'), financeA3: await login('recette.finance.agence3@lca-test.cg'),
  deliveryA3: await login('recette.responsable_livraison@lca-test.cg'), technicianA3: await login('recette.technicien@lca-test.cg'),
  advisorA4: await login('recette.conseiller_sav@lca-test.cg'),
};
async function observe(actor, path, options = {}) { const result = await api(path, { token: actors[actor].accessToken, expected: [200, 201, 403, 404], ...options }); observations.push({ actor, actorAgency: actors[actor].user.agencyId, path, status: result.status, message: result.data?.message }); return result; }
await observe('partsA2', '/parts?agencyId=2&search=REC16&page=1&pageSize=20');
const forbiddenParts = await observe('partsA2', '/parts/8/adjustments', { method: 'POST', body: { agencyId: '3', locationId: '7', quantity: 1, reason: 'REC16-MA interdit' } });
checks.push({ name: 'agency-parts-mutation-denied', ok: forbiddenParts.status === 403 });
await observe('commercialA3', '/vehicles/12'); await observe('commercialA3', '/vehicles/11');
await observe('financeA3', '/invoices/22'); await observe('financeA3', '/invoices/13');
await observe('deliveryA3', '/deliveries/6'); await observe('deliveryA3', '/deliveries/4');
await observe('technicianA3', '/repair-orders/7'); await observe('technicianA3', '/repair-orders/6');
await observe('advisorA4', '/repair-orders/7');
await observe('admin', '/vehicles/11'); await observe('admin', '/vehicles/12'); await observe('admin', '/invoices/13'); await observe('admin', '/invoices/22');
const privateNotification = await observe('partsA2', '/notifications/105/read', { method: 'PATCH' });
checks.push({ name: 'private-notification-denied', ok: privateNotification.status === 403 });
checks.push({ name: 'global-admin-cross-agency', ok: observations.filter((item) => item.actor === 'admin').every((item) => item.status === 200) });
checks.push({ name: 'agency-parts-read-source', ok: observations.find((item) => item.actor === 'partsA2' && item.path.startsWith('/parts?'))?.status === 200 });
const result = { generatedAt: new Date().toISOString(), actors: Object.fromEntries(Object.entries(actors).map(([name, value]) => [name, { id: value.user.id, agencyId: value.user.agencyId, roles: value.user.roles, permissions: value.user.permissions }])), observations, checks, failed: checks.filter((item) => !item.ok) };
await writeFile('/tmp/stabilisation-erp-16-multi-agency.json', JSON.stringify(result, null, 2)); console.log(JSON.stringify({ observations, checks, failed: result.failed }, null, 2)); if (result.failed.length) process.exitCode = 1;
