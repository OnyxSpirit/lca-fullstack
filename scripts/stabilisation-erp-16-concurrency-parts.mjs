import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:3004/api', password = process.env.RECETTE_USER_PASSWORD;
if (!password) throw new Error('RECETTE_USER_PASSWORD absent');
const calls = [];
async function api(path, { method = 'GET', token, body, expected = [200] } = {}) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const raw = await response.text(); let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw: raw.slice(0, 300) }; }
  calls.push({ method, path, status: response.status });
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return { status: response.status, data };
}
const token = (await api('/auth/login', { method: 'POST', body: { email: 'recette.responsable_pieces.a2@lca-test.cg', password } })).data.accessToken;
let refs = (await api('/part-references?agencyId=2', { token })).data;
let category = refs.categories.find((item) => item.code === 'REC16CONC');
let supplier = refs.suppliers.find((item) => item.code === 'REC10') ?? refs.suppliers[0];
let source = refs.locations.find((item) => item.name === 'Magasin REC16-CONC source');
if (!category) category = (await api('/part-categories', { method: 'POST', token, body: { name: 'REC16 Concurrence', code: 'REC16CONC', description: 'ERP-16 concurrence Pièces' }, expected: [201] })).data;
if (!source) source = (await api('/part-locations', { method: 'POST', token, body: { agencyId: '2', name: 'Magasin REC16-CONC source', type: 'warehouse' }, expected: [201] })).data;
let locations = (await api('/part-locations?targetAgency=2', { token })).data;
let destination = locations.find((item) => item.name === 'Magasin REC16-CONC destination');
if (!destination) destination = (await api('/part-locations?targetAgency=2', { method: 'POST', token, body: { agencyId: '2', name: 'Magasin REC16-CONC destination', type: 'warehouse' }, expected: [201] })).data;
let partsResponse = (await api('/parts?agencyId=2&search=REC16-CONC&page=1&pageSize=100', { token })).data;
let parts = partsResponse.items ?? partsResponse;
let part = parts.find((item) => item.reference === 'REC16-CONC-DERNIERE');
if (!part) part = (await api('/parts', { method: 'POST', token, body: { agencyId: '2', categoryId: String(category.id), supplierId: String(supplier.id), locationId: String(source.id), reference: 'REC16-CONC-DERNIERE', name: 'REC16-CONC dernière unité', brand: 'REC16', purchasePrice: 5000, salePrice: 8000, initialQuantity: 1, minStock: 1, maxStock: 5 }, expected: [201] })).data;
let detail = (await api(`/parts/${part.id}?agencyId=2`, { token })).data;
const sourceStock = detail.stocks.find((item) => String(item.location_id) === String(source.id));
let race = [];
if (Number(sourceStock.current_stock) === 1) {
  const body = (key) => ({ agencyId: '2', sourceLocationId: String(source.id), destinationAgencyId: '2', destinationLocationId: String(destination.id), quantity: 1, idempotencyKey: key, notes: 'REC16-CONC dernière unité' });
  race = await Promise.all([
    api(`/parts/${part.id}/transfers`, { method: 'POST', token, body: body(`REC16-CONC-PART-A-${randomUUID()}`), expected: [201, 409] }),
    api(`/parts/${part.id}/transfers`, { method: 'POST', token, body: body(`REC16-CONC-PART-B-${randomUUID()}`), expected: [201, 409] }),
  ]);
}
detail = (await api(`/parts/${part.id}?agencyId=2`, { token })).data;
const movements = (await api(`/parts/${part.id}/movements?agencyId=2&page=1&pageSize=100`, { token })).data;
const finalSource = detail.stocks.find((item) => String(item.location_id) === String(source.id));
const finalDestination = detail.stocks.find((item) => String(item.location_id) === String(destination.id));
const result = { generatedAt: new Date().toISOString(), partId: String(part.id), reference: part.reference, sourceId: String(source.id), destinationId: String(destination.id), race: race.map((item) => ({ status: item.status, message: item.data?.message, correlationKey: item.data?.correlationKey })), final: { source: Number(finalSource?.current_stock ?? 0), destination: Number(finalDestination?.current_stock ?? 0), reserved: Number(finalSource?.reserved_stock ?? 0) }, movements: movements.items ?? movements, calls };
result.valid = (race.length === 0 || race.filter((item) => item.status === 201).length === 1 && race.filter((item) => item.status === 409).length === 1) && result.final.source === 0 && result.final.destination === 1 && result.final.reserved === 0;
await writeFile('/tmp/stabilisation-erp-16-concurrency-parts.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
