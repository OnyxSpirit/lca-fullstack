import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const base = 'http://127.0.0.1:3004/api';
const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error('Variables recette absentes');
const calls = [], checks = [], races = {};
const ok = (name, value, detail) => checks.push({ name, ok: Boolean(value), detail });
async function api(path, { method = 'GET', token, body, expected = [200] } = {}) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const raw = await response.text(); let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw: raw.slice(0, 300) }; }
  calls.push({ method, path, status: response.status });
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return { status: response.status, data };
}
const token = (await api('/auth/login', { method: 'POST', body: { email, password } })).data.accessToken;
const users = (await api('/users', { token })).data, admin = users.find((item) => item.email === email), originalAgency = String(admin.agencyId);
const deliveryUser = users.find((item) => item.email === 'recette.responsable_livraison@lca-test.cg');
function crc32(buffer) { let value = 0xffffffff; for (const byte of buffer) { value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4); length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([length, name, data, crc]); }
function signature() { const width = 120, height = 40, raw = Buffer.alloc((width * 4 + 1) * height, 255); for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; for (let x = 0; x < width; x++) { const offset = y * (width * 4 + 1) + 1 + x * 4; if (Math.abs(y - (20 + Math.sin(x / 8) * 8)) < 2) raw.fill(15, offset, offset + 3); raw[offset + 3] = 255; } } const h = Buffer.alloc(13); h.writeUInt32BE(width); h.writeUInt32BE(height, 4); h[8] = 8; h[9] = 6; return `data:image/png;base64,${Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'), chunk('IHDR', h), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64')}`; }

try {
  if (originalAgency !== '3') await api(`/users/${admin.id}`, { method: 'PATCH', token, body: { agencyId: '3' } });
  const customer = (await api('/customers/10/360', { token })).data;
  let vehicle = (await api('/vehicles/14', { token })).data;
  let sale = (await api('/sales/11', { token })).data;
  let invoice = (await api('/invoices/22', { token })).data;
  if (vehicle.vin !== 'REC16CN0000000002' || sale.id !== '11' || invoice.id !== '22') throw new Error('Préconditions de reprise REC16-CONC non satisfaites');
  await api('/invoices/22/status', { method: 'PATCH', token, body: { status: 'issued' } });
  invoice = (await api('/invoices/22', { token })).data;
  const methods = (await api('/invoices/payment-methods', { token })).data, cash = methods.find((item) => item.code === 'CASH') ?? methods[0];
  if (Number(invoice.balance_due) > 0) await api('/invoices/22/payments', { method: 'POST', token, body: { paymentMethodId: String(cash.id), amount: Number(invoice.balance_due), reference: cash.requires_reference ? 'REC16-CONC-DELIVERY-PAY' : null, notes: 'REC16-CONC vente livraison', idempotencyKey: 'REC16-CONC-DELIVERY-PAY' }, expected: [200, 201] });
  const setSale = async (status) => { sale = (await api('/sales/11/status', { method: 'PATCH', token, body: { status } })).data; };
  sale = (await api('/sales/11', { token })).data;
  if (sale.status === 'confirmed') await setSale('preparation');
  if (sale.status === 'preparation') await setSale('ready_for_delivery');
  let deliveries = (await api('/deliveries', { token })).data;
  let delivery = (deliveries.items ?? deliveries).find((item) => String(item.sale_id) === '11' && item.status !== 'cancelled');
  if (!delivery) delivery = (await api('/deliveries', { method: 'POST', token, body: { saleId: '11', deliverySpecialistId: String(deliveryUser.id), scheduledAt: new Date(Date.now() + 86400000).toISOString(), deliveryLocation: 'Agence REC16-CONC A3', customerNotes: 'Finalisation concurrente' }, expected: [201] })).data;
  let detail = (await api(`/deliveries/${delivery.id}`, { token })).data;
  if (detail.status === 'planned') detail = (await api(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token, body: { status: 'preparing' } })).data;
  if (detail.status === 'preparing') detail = (await api(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token, body: { status: 'quality_control' } })).data;
  for (const item of detail.checklist.filter((entry) => !entry.completed_at)) await api(`/deliveries/${delivery.id}/checklist/${item.id}`, { method: 'PATCH', token, body: { completed: true, notes: 'REC16-CONC conforme' } });
  detail = (await api(`/deliveries/${delivery.id}`, { token })).data;
  if (detail.status === 'quality_control') detail = (await api(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token, body: { status: 'ready' } })).data;
  const signBody = { signerName: 'Concurrence REC16', signatureData: signature(), consentText: 'REC16-CONC livraison acceptée', mileageAtDelivery: 15 };
  if (detail.status === 'ready') {
    const race = await Promise.all([
      api(`/deliveries/${delivery.id}/sign`, { method: 'POST', token, body: signBody, expected: [200, 201] }),
      api(`/deliveries/${delivery.id}/sign`, { method: 'POST', token, body: signBody, expected: [200, 201] }),
    ]);
    races.delivery = race.map((item) => ({ status: item.status, finalStatus: item.data.status }));
    ok('delivery-race', race.every((item) => item.data.status === 'delivered') && race.filter((item) => item.status === 201).length === 1 && race.filter((item) => item.status === 200).length === 1, races.delivery);
  } else ok('delivery-race', detail.status === 'delivered', 'reprise');
  const replay = await api(`/deliveries/${delivery.id}/sign`, { method: 'POST', token, body: signBody, expected: [200] });
  ok('delivery-replay', replay.data.status === 'delivered');

  const advisor = (await api('/repair-orders/advisor-candidates?targetAgency=3', { token })).data[0];
  let orders = (await api('/repair-orders?page=1&pageSize=100', { token })).data.items;
  let order = orders.find((item) => item.complaint === 'REC16-CONC-OR');
  if (!order) order = (await api('/repair-orders', { method: 'POST', token, body: { customerId: '10', vehicleId: '14', advisorId: String(advisor.id), mileage: 16, complaint: 'REC16-CONC-OR', diagnosisSummary: 'Transition et facture concurrentes', promisedCompletionAt: '2026-10-21 17:00:00' }, expected: [201] })).data;
  const route = (suffix = '') => `/repair-orders/${order.id}${suffix}`;
  order = (await api(route(), { token })).data;
  if (order.status === 'planned') {
    await api(route('/inspection'), { method: 'POST', token, body: { fuelLevel: 'Moitié', cleanliness: 'Propre', mileage: 16, observations: 'REC16-CONC réception' } });
    const race = await Promise.all([
      api(route('/status'), { method: 'PATCH', token, body: { status: 'received' }, expected: [200, 409] }),
      api(route('/status'), { method: 'PATCH', token, body: { status: 'received' }, expected: [200, 409] }),
    ]);
    races.orderTransition = race.map((item) => ({ status: item.status, finalStatus: item.data?.status, message: item.data?.message }));
    ok('order-transition-race', race.filter((item) => item.status === 200).length === 1 && race.filter((item) => item.status === 409).length === 1, races.orderTransition);
  }
  order = (await api(route(), { token })).data;
  if (order.status === 'received') order = (await api(route('/status'), { method: 'PATCH', token, body: { status: 'diagnosis' } })).data;
  const tech = (await api(route('/technician-candidates'), { token })).data[0];
  if (!order.diagnostics.length) order = (await api(route('/diagnostics'), { method: 'POST', token, body: { technicianId: String(tech.id), diagnosis: 'Contrôle concurrent REC16', recommendations: 'Main-d’œuvre contrôlée', estimatedHours: 1 }, expected: [201] })).data;
  if (!order.estimateItems.length) order = (await api(route('/estimate-items'), { method: 'POST', token, body: { itemType: 'labor', description: 'Intervention REC16-CONC', quantity: 1, rateCode: 'T1', requestKey: 'REC16-CONC-OR-EST' }, expected: [201] })).data;
  if (order.status === 'diagnosis') order = (await api(route('/status'), { method: 'PATCH', token, body: { status: 'waiting_approval' } })).data;
  if (!order.approvals.length) order = (await api(route('/approval'), { method: 'POST', token, body: { approved: true, customerName: 'Concurrence REC16', notes: 'REC16-CONC accord' }, expected: [201] })).data;
  if (order.status === 'waiting_approval') order = (await api(route('/status'), { method: 'PATCH', token, body: { status: 'in_progress' } })).data;
  let intervention = order.interventions[0];
  if (!intervention) { order = (await api(route(`/estimate-items/${order.estimateItems[0].id}/intervention`), { method: 'POST', token, body: {}, expected: [201] })).data; intervention = order.interventions[0]; }
  if (!order.items.length) order = (await api(route('/items'), { method: 'POST', token, body: { itemType: 'labor', interventionId: String(intervention.id), estimateItemId: String(order.estimateItems[0].id), quantity: 1, requestKey: 'REC16-CONC-OR-ACT' }, expected: [201] })).data;
  intervention = order.interventions.find((item) => String(item.id) === String(intervention.id));
  if (intervention.status === 'planned') {
    if (!order.schedules.some((item) => String(item.intervention_id) === String(intervention.id))) await api(route('/assign'), { method: 'POST', token, body: { technicianId: String(tech.id), interventionId: String(intervention.id), startsAt: '2026-10-22 09:00:00', endsAt: '2026-10-22 10:00:00', notes: 'REC16-CONC affectation' }, expected: [201] });
    const session = (await api(route('/sessions/start'), { method: 'POST', token, body: { technicianId: String(tech.id), interventionId: String(intervention.id) }, expected: [201] })).data;
    order = (await api(route(`/sessions/${session.id}/stop`), { method: 'PATCH', token, body: {} })).data;
    intervention = order.interventions.find((item) => String(item.id) === String(intervention.id));
  }
  if (intervention.status !== 'completed') order = (await api(route(`/interventions/${intervention.id}/status`), { method: 'PATCH', token, body: { status: 'completed' } })).data;
  if (order.status === 'in_progress') order = (await api(route('/status'), { method: 'PATCH', token, body: { status: 'quality_control' } })).data;
  if (order.status === 'quality_control' && !order.qualityControls.length) order = (await api(route('/quality-control'), { method: 'POST', token, body: { result: 'passed', plannedWorkCompleted: true, defectCorrected: true, roadTestPerformed: true, noLeaks: true, levelsChecked: true, cleanlinessChecked: true, observations: 'REC16-CONC QC' }, expected: [201] })).data;
  if (order.status === 'quality_control') order = (await api(route('/status'), { method: 'PATCH', token, body: { status: 'ready' } })).data;
  if (order.status === 'ready') {
    const race = await Promise.all([
      api(route('/invoice'), { method: 'POST', token, body: {}, expected: [201] }),
      api(route('/invoice'), { method: 'POST', token, body: {}, expected: [201] }),
    ]);
    races.workshopInvoice = race.map((item) => ({ status: item.status, id: item.data.id }));
    ok('workshop-invoice-race', new Set(race.map((item) => String(item.data.id))).size === 1, races.workshopInvoice);
  }
  order = (await api(route(), { token })).data;
  ok('single-intervention', order.interventions.length === 1, order.interventions.length);
  ok('order-invoiced', order.status === 'invoiced' && Boolean(order.invoice?.id), order.invoice);
  const result = { generatedAt: new Date().toISOString(), resources: { customerId: '10', vehicleId: '14', saleId: '11', saleInvoiceId: '22', deliveryId: String(delivery.id), orderId: String(order.id), orderNumber: order.order_number, workshopInvoiceId: String(order.invoice?.id) }, races, checks, failed: checks.filter((item) => !item.ok), calls };
  await writeFile('/tmp/stabilisation-erp-16-concurrency-resume.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (result.failed.length) process.exitCode = 1;
} finally {
  if (originalAgency !== '3') await api(`/users/${admin.id}`, { method: 'PATCH', token, body: { agencyId: originalAgency } });
}
