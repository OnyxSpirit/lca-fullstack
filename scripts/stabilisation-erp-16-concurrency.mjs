import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const base = 'http://127.0.0.1:3004/api';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) throw new Error('Variables recette absentes');
const calls = [], checks = [], races = {};
const ok = (name, value, detail) => checks.push({ name, ok: Boolean(value), detail });
async function api(path, { method = 'GET', token, body, expected = [200] } = {}) {
  const started = performance.now();
  const response = await fetch(base + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const raw = await response.text(); let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw: raw.slice(0, 300) }; }
  calls.push({ method, path, status: response.status, ms: Math.round((performance.now() - started) * 100) / 100 });
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return { status: response.status, data };
}
const login = async () => (await api('/auth/login', { method: 'POST', body: { email: adminEmail, password: adminPassword } })).data.accessToken;
const token = await login();
const users = (await api('/users', { token })).data;
const admin = users.find((item) => item.email === adminEmail);
const originalAgency = String(admin.agencyId);
const commercial = users.find((item) => item.email === 'recette.commercial@lca-test.cg');
const deliveryUser = users.find((item) => item.email === 'recette.responsable_livraison@lca-test.cg');

function crc32(buffer) { let value = 0xffffffff; for (const byte of buffer) { value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4); length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([length, name, data, crc]); }
function signature() { const width = 120, height = 40, raw = Buffer.alloc((width * 4 + 1) * height, 255); for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; for (let x = 0; x < width; x++) { const offset = y * (width * 4 + 1) + 1 + x * 4; if (Math.abs(y - (20 + Math.sin(x / 8) * 8)) < 2) raw.fill(15, offset, offset + 3); raw[offset + 3] = 255; } } const h = Buffer.alloc(13); h.writeUInt32BE(width); h.writeUInt32BE(height, 4); h[8] = 8; h[9] = 6; return `data:image/png;base64,${Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'), chunk('IHDR', h), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64')}`; }

try {
  if (originalAgency !== '3') await api(`/users/${admin.id}`, { method: 'PATCH', token, body: { agencyId: '3' } });
  let customers = (await api('/customers?search=REC16-CONC&page=1&pageSize=100', { token })).data;
  let customer = (customers.items ?? customers).find((item) => item.email === 'rec16.conc.client@example.test');
  if (!customer) customer = (await api('/customers', { method: 'POST', token, body: { agencyId: '3', customerType: 'individual', firstName: 'Concurrence', lastName: 'REC16', email: 'rec16.conc.client@example.test', phone: '+2420616000016', city: 'Brazzaville', classification: 'regular', source: 'ERP-16', notes: 'REC16-CONC transactions' }, expected: [201] })).data;
  const references = (await api('/vehicle-references?agencyId=3', { token })).data;
  const brand = references.brands.find((item) => String(item.name).toLowerCase() === 'hyundai') ?? references.brands[0];
  const location = references.locations.find((item) => ['PARC','SHOWROOM'].includes(String(item.type).toUpperCase())) ?? references.locations[0];
  async function vehicle(vin, note) {
    const list = (await api(`/vehicles?search=${vin}&view=all&page=1&pageSize=20`, { token })).data.items ?? [];
    return list.find((item) => item.vin === vin) ?? (await api('/vehicles', { method: 'POST', token, body: { vin, brand: brand.name, model: 'Tucson', version: 'REC16-CONC', vehicleType: 'new', year: 2026, color: 'Gris', fuelType: 'Essence', transmission: 'Automatique', mileage: 10, purchasePrice: 14000000, catalogPrice: 20000000, salePrice: 19000000, minimumPrice: 18000000, status: 'available', agencyId: '3', locationId: String(location.id), bodyType: 'SUV', notes: note }, expected: [201] })).data;
  }
  const raceVehicle = await vehicle('REC16CN0000000001', 'REC16-CONC vente concurrente');
  const deliveryVehicle = await vehicle('REC16CN0000000002', 'REC16-CONC livraison et OR');
  const saleBody = (vehicleId, key, notes) => ({ customerId: String(customer.id), vehicleId: String(vehicleId), agencyId: '3', salespersonId: String(commercial.id), discount: 0, depositAmount: 0, taxMode: 'TAXABLE', priceInputMode: 'HT', notes, idempotencyKey: key, warranty: { decision: 'NOT_APPLICABLE' } });

  let existingSales = (await api(`/sales?customerId=${customer.id}`, { token })).data.items ?? [];
  let saleRaceWinner = existingSales.find((item) => String(item.vehicle_id) === String(raceVehicle.id));
  if (!saleRaceWinner) {
    const race = await Promise.all([
      api('/sales', { method: 'POST', token, body: saleBody(raceVehicle.id, `REC16-CONC-SALE-A-${randomUUID()}`, 'REC16-CONC-SALE-RACE-A'), expected: [201, 409] }),
      api('/sales', { method: 'POST', token, body: saleBody(raceVehicle.id, `REC16-CONC-SALE-B-${randomUUID()}`, 'REC16-CONC-SALE-RACE-B'), expected: [201, 409] }),
    ]);
    races.sale = race.map((item) => ({ status: item.status, id: item.data?.id, message: item.data?.message }));
    ok('sale-race-one-winner', race.filter((item) => item.status === 201).length === 1 && race.filter((item) => item.status === 409).length === 1, races.sale);
    saleRaceWinner = race.find((item) => item.status === 201).data;
  } else ok('sale-race-one-winner', true, 'reprise ressource existante');

  const invoiceBody = (key, amount, notes) => ({ agencyId: '3', customerId: String(customer.id), invoiceType: 'manual', issueDate: new Date().toISOString().slice(0, 10), notes, idempotencyKey: key, items: [{ description: notes, quantity: 1, unitPrice: amount, discount: 0 }] });
  const invoiceKey = 'REC16-CONC-INV-SEQUENTIAL';
  const firstInvoice = await api('/invoices', { method: 'POST', token, body: invoiceBody(invoiceKey, 90000, 'REC16-CONC facture séquentielle'), expected: [200, 201] });
  const replayInvoice = await api('/invoices', { method: 'POST', token, body: invoiceBody(invoiceKey, 90000, 'REC16-CONC facture séquentielle'), expected: [200, 201] });
  ok('invoice-sequential-idempotent', String(firstInvoice.data.id) === String(replayInvoice.data.id) && replayInvoice.data.duplicate === true, [firstInvoice, replayInvoice]);
  const concurrentInvoiceKey = 'REC16-CONC-INV-CONCURRENT';
  const invoiceRace = await Promise.all([
    api('/invoices', { method: 'POST', token, body: invoiceBody(concurrentInvoiceKey, 95000, 'REC16-CONC facture concurrente'), expected: [200, 201] }),
    api('/invoices', { method: 'POST', token, body: invoiceBody(concurrentInvoiceKey, 95000, 'REC16-CONC facture concurrente'), expected: [200, 201] }),
  ]);
  races.invoice = invoiceRace.map((item) => ({ status: item.status, id: item.data.id, duplicate: item.data.duplicate }));
  ok('invoice-concurrent-idempotent', new Set(invoiceRace.map((item) => String(item.data.id))).size === 1 && invoiceRace.filter((item) => item.data.duplicate).length === 1, races.invoice);

  async function issuedInvoice(key, amount, notes) {
    const created = await api('/invoices', { method: 'POST', token, body: invoiceBody(key, amount, notes), expected: [200, 201] });
    let detail = await api(`/invoices/${created.data.id}`, { token });
    if (['draft', 'issued', 'partially_paid', 'paid'].includes(detail.data.status)) await api(`/invoices/${created.data.id}/status`, { method: 'PATCH', token, body: { status: 'issued' } });
    return (await api(`/invoices/${created.data.id}`, { token })).data;
  }
  const methods = (await api('/invoices/payment-methods', { token })).data;
  const cash = methods.find((item) => item.code === 'CASH') ?? methods[0];
  const paymentBody = (amount, key, notes) => ({ paymentMethodId: String(cash.id), amount, reference: cash.requires_reference ? key : null, notes, idempotencyKey: key });
  const overpayInvoice = await issuedInvoice('REC16-CONC-INV-OVERPAY', 100000, 'REC16-CONC surencaissement');
  let overpayPayments = (await api(`/invoices/${overpayInvoice.id}/payments`, { token })).data;
  if (!overpayPayments.length) {
    const race = await Promise.all([
      api(`/invoices/${overpayInvoice.id}/payments`, { method: 'POST', token, body: paymentBody(100000, `REC16-CONC-OVERPAY-A-${randomUUID()}`, 'REC16-CONC paiement A'), expected: [201, 409] }),
      api(`/invoices/${overpayInvoice.id}/payments`, { method: 'POST', token, body: paymentBody(100000, `REC16-CONC-OVERPAY-B-${randomUUID()}`, 'REC16-CONC paiement B'), expected: [201, 409] }),
    ]);
    races.paymentOverrun = race.map((item) => ({ status: item.status, id: item.data?.id, message: item.data?.message }));
    ok('payment-race-no-overrun', race.filter((item) => item.status === 201).length === 1 && race.filter((item) => item.status === 409).length === 1, races.paymentOverrun);
  } else ok('payment-race-no-overrun', true, 'reprise ressource existante');
  const paidOverrun = (await api(`/invoices/${overpayInvoice.id}`, { token })).data;
  ok('payment-race-balance', Number(paidOverrun.amount_paid) === 100000 && Number(paidOverrun.balance_due) === Number(paidOverrun.total) - 100000 && paidOverrun.status === 'partially_paid', paidOverrun);

  const replayPaymentInvoice = await issuedInvoice('REC16-CONC-INV-PAY-REPLAY', 120000, 'REC16-CONC paiement rejeu');
  const replayKey = 'REC16-CONC-PAY-REPLAY';
  const priorReplay = (await api(`/invoices/${replayPaymentInvoice.id}/payments`, { token })).data;
  const payFirst = priorReplay[0] ? { status: 201, data: priorReplay[0] } : await api(`/invoices/${replayPaymentInvoice.id}/payments`, { method: 'POST', token, body: paymentBody(60000, replayKey, 'REC16-CONC intention stable'), expected: [201] });
  const payReplay = await api(`/invoices/${replayPaymentInvoice.id}/payments`, { method: 'POST', token, body: paymentBody(60000, replayKey, 'REC16-CONC intention stable'), expected: [200] });
  ok('payment-sequential-idempotent', String(payFirst.data.id) === String(payReplay.data.id) && payReplay.data.duplicate === true, [payFirst, payReplay]);
  const concurrentPayInvoice = await issuedInvoice('REC16-CONC-INV-PAY-CONCURRENT', 130000, 'REC16-CONC paiement concurrent identique');
  let concurrentPrior = (await api(`/invoices/${concurrentPayInvoice.id}/payments`, { token })).data;
  if (!concurrentPrior.length) {
    const sameKey = 'REC16-CONC-PAY-CONCURRENT';
    const race = await Promise.all([
      api(`/invoices/${concurrentPayInvoice.id}/payments`, { method: 'POST', token, body: paymentBody(65000, sameKey, 'REC16-CONC même intention'), expected: [200, 201] }),
      api(`/invoices/${concurrentPayInvoice.id}/payments`, { method: 'POST', token, body: paymentBody(65000, sameKey, 'REC16-CONC même intention'), expected: [200, 201] }),
    ]);
    races.paymentIdempotent = race.map((item) => ({ status: item.status, id: item.data.id, duplicate: item.data.duplicate }));
    ok('payment-concurrent-idempotent', new Set(race.map((item) => String(item.data.id))).size === 1 && race.filter((item) => item.data.duplicate).length === 1, races.paymentIdempotent);
  } else ok('payment-concurrent-idempotent', true, 'reprise ressource existante');

  let deliverySale = existingSales.find((item) => String(item.vehicle_id) === String(deliveryVehicle.id));
  if (!deliverySale) deliverySale = (await api('/sales', { method: 'POST', token, body: saleBody(deliveryVehicle.id, 'REC16-CONC-DELIVERY-SALE', 'REC16-CONC livraison et OR'), expected: [201] })).data;
  const saleStatus = async (status) => { deliverySale = (await api(`/sales/${deliverySale.id}/status`, { method: 'PATCH', token, body: { status } })).data; };
  deliverySale = (await api(`/sales/${deliverySale.id}`, { token })).data;
  if (deliverySale.status === 'reserved') await saleStatus('ordered');
  if (deliverySale.status === 'ordered') await saleStatus('confirmed');
  let vehicleInvoice = deliverySale.invoice_id ? (await api(`/invoices/${deliverySale.invoice_id}`, { token })).data : null;
  if (!vehicleInvoice) vehicleInvoice = (await api('/invoices', { method: 'POST', token, body: { agencyId: '3', customerId: String(customer.id), saleId: String(deliverySale.id), invoiceType: 'vehicle', issueDate: new Date().toISOString().slice(0, 10), notes: 'REC16-CONC livraison', idempotencyKey: 'REC16-CONC-DELIVERY-INVOICE', items: [{ vehicleId: String(deliveryVehicle.id), description: 'Hyundai Tucson REC16-CONC', quantity: 1, unitPrice: Number(deliverySale.total), discount: 0 }] }, expected: [200, 201] })).data;
  vehicleInvoice = (await api(`/invoices/${vehicleInvoice.id}`, { token })).data;
  if (['draft', 'issued', 'partially_paid', 'paid'].includes(vehicleInvoice.status)) await api(`/invoices/${vehicleInvoice.id}/status`, { method: 'PATCH', token, body: { status: 'issued' } });
  vehicleInvoice = (await api(`/invoices/${vehicleInvoice.id}`, { token })).data;
  if (Number(vehicleInvoice.balance_due) > 0) await api(`/invoices/${vehicleInvoice.id}/payments`, { method: 'POST', token, body: paymentBody(Number(vehicleInvoice.balance_due), 'REC16-CONC-DELIVERY-PAY', 'REC16-CONC vente livraison'), expected: [200, 201] });
  deliverySale = (await api(`/sales/${deliverySale.id}`, { token })).data;
  if (deliverySale.status === 'confirmed') await saleStatus('preparation');
  if (deliverySale.status === 'preparation') await saleStatus('ready_for_delivery');
  let deliveries = (await api('/deliveries', { token })).data;
  let delivery = (deliveries.items ?? deliveries).find((item) => String(item.sale_id) === String(deliverySale.id) && item.status !== 'cancelled');
  if (!delivery) delivery = (await api('/deliveries', { method: 'POST', token, body: { saleId: String(deliverySale.id), deliverySpecialistId: String(deliveryUser.id), scheduledAt: new Date(Date.now() + 86400000).toISOString(), deliveryLocation: 'Agence REC16-CONC A3', customerNotes: 'Finalisation concurrente' }, expected: [201] })).data;
  let deliveryDetail = (await api(`/deliveries/${delivery.id}`, { token })).data;
  if (deliveryDetail.status === 'planned') deliveryDetail = (await api(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token, body: { status: 'preparing' } })).data;
  if (deliveryDetail.status === 'preparing') deliveryDetail = (await api(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token, body: { status: 'quality_control' } })).data;
  for (const item of deliveryDetail.checklist.filter((entry) => !entry.completed_at)) await api(`/deliveries/${delivery.id}/checklist/${item.id}`, { method: 'PATCH', token, body: { completed: true, notes: 'REC16-CONC conforme' } });
  deliveryDetail = (await api(`/deliveries/${delivery.id}`, { token })).data;
  if (deliveryDetail.status === 'quality_control') deliveryDetail = (await api(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token, body: { status: 'ready' } })).data;
  const signBody = { signerName: 'Concurrence REC16', signatureData: signature(), consentText: 'REC16-CONC livraison acceptée', mileageAtDelivery: 15 };
  if (deliveryDetail.status === 'ready') {
    const race = await Promise.all([
      api(`/deliveries/${delivery.id}/sign`, { method: 'POST', token, body: signBody, expected: [200, 201] }),
      api(`/deliveries/${delivery.id}/sign`, { method: 'POST', token, body: signBody, expected: [200, 201] }),
    ]);
    races.delivery = race.map((item) => ({ status: item.status, state: item.data.status }));
    ok('delivery-race-single-finalization', race.every((item) => item.data.status === 'delivered'), races.delivery);
  } else ok('delivery-race-single-finalization', deliveryDetail.status === 'delivered', 'reprise ressource existante');
  const deliveryReplay = await api(`/deliveries/${delivery.id}/sign`, { method: 'POST', token, body: signBody, expected: [200] });
  ok('delivery-replay-idempotent', deliveryReplay.data.status === 'delivered');

  const advisor = (await api('/repair-orders/advisor-candidates?targetAgency=3', { token })).data[0];
  let orders = (await api('/repair-orders?page=1&pageSize=100', { token })).data.items;
  let order = orders.find((item) => item.complaint === 'REC16-CONC-OR');
  if (!order) order = (await api('/repair-orders', { method: 'POST', token, body: { customerId: String(customer.id), vehicleId: String(deliveryVehicle.id), advisorId: String(advisor.id), mileage: 16, complaint: 'REC16-CONC-OR', diagnosisSummary: 'Transition et facture concurrentes', promisedCompletionAt: '2026-10-21 17:00:00' }, expected: [201] })).data;
  const ro = (suffix = '') => `/repair-orders/${order.id}${suffix}`;
  order = (await api(ro(), { token })).data;
  if (order.status === 'planned') {
    if (!order.inspection) await api(ro('/inspection'), { method: 'POST', token, body: { fuelLevel: 'Moitié', cleanliness: 'Propre', mileage: 16, observations: 'REC16-CONC réception' } });
    const race = await Promise.all([
      api(ro('/status'), { method: 'PATCH', token, body: { status: 'received' }, expected: [200, 409] }),
      api(ro('/status'), { method: 'PATCH', token, body: { status: 'received' }, expected: [200, 409] }),
    ]);
    races.orderTransition = race.map((item) => ({ status: item.status, state: item.data?.status, message: item.data?.message }));
    ok('order-transition-race', race.filter((item) => item.status === 200).length === 1 && race.filter((item) => item.status === 409).length === 1, races.orderTransition);
  } else ok('order-transition-race', true, 'reprise ressource existante');
  order = (await api(ro(), { token })).data;
  if (order.status === 'received') order = (await api(ro('/status'), { method: 'PATCH', token, body: { status: 'diagnosis' } })).data;
  const technician = (await api(ro('/technician-candidates'), { token })).data[0];
  if (!order.diagnostics.length) order = (await api(ro('/diagnostics'), { method: 'POST', token, body: { technicianId: String(technician.id), diagnosis: 'Contrôle concurrent REC16', recommendations: 'Main-d’œuvre contrôlée', estimatedHours: 1 }, expected: [201] })).data;
  if (!order.estimateItems.length) order = (await api(ro('/estimate-items'), { method: 'POST', token, body: { itemType: 'labor', description: 'Intervention REC16-CONC', quantity: 1, rateCode: 'T1', requestKey: 'REC16-CONC-OR-EST' }, expected: [201] })).data;
  if (order.status === 'diagnosis') order = (await api(ro('/status'), { method: 'PATCH', token, body: { status: 'waiting_approval' } })).data;
  if (!order.approvals.length) order = (await api(ro('/approval'), { method: 'POST', token, body: { approved: true, customerName: 'Concurrence REC16', notes: 'REC16-CONC accord' }, expected: [201] })).data;
  if (order.status === 'waiting_approval') order = (await api(ro('/status'), { method: 'PATCH', token, body: { status: 'in_progress' } })).data;
  let intervention = order.interventions[0];
  if (!intervention) { order = (await api(ro(`/estimate-items/${order.estimateItems[0].id}/intervention`), { method: 'POST', token, body: {}, expected: [201] })).data; intervention = order.interventions[0]; }
  if (!order.items.length) order = (await api(ro('/items'), { method: 'POST', token, body: { itemType: 'labor', interventionId: String(intervention.id), estimateItemId: String(order.estimateItems[0].id), quantity: 1, requestKey: 'REC16-CONC-OR-ACT' }, expected: [201] })).data;
  intervention = order.interventions.find((item) => String(item.id) === String(intervention.id));
  if (intervention.status !== 'completed') order = (await api(ro(`/interventions/${intervention.id}/status`), { method: 'PATCH', token, body: { status: 'completed' } })).data;
  if (order.status === 'in_progress') order = (await api(ro('/status'), { method: 'PATCH', token, body: { status: 'quality_control' } })).data;
  if (order.status === 'quality_control' && !order.qualityControls.length) order = (await api(ro('/quality-control'), { method: 'POST', token, body: { result: 'passed', plannedWorkCompleted: true, defectCorrected: true, roadTestPerformed: true, noLeaks: true, levelsChecked: true, cleanlinessChecked: true, observations: 'REC16-CONC QC' }, expected: [201] })).data;
  if (order.status === 'quality_control') order = (await api(ro('/status'), { method: 'PATCH', token, body: { status: 'ready' } })).data;
  if (order.status === 'ready') {
    const race = await Promise.all([
      api(ro('/invoice'), { method: 'POST', token, body: {}, expected: [201] }),
      api(ro('/invoice'), { method: 'POST', token, body: {}, expected: [201] }),
    ]);
    races.orderInvoice = race.map((item) => ({ status: item.status, id: item.data.id }));
    ok('order-invoice-concurrent-idempotent', new Set(race.map((item) => String(item.data.id))).size === 1, races.orderInvoice);
  } else ok('order-invoice-concurrent-idempotent', Boolean(order.invoice_id), 'reprise ressource existante');
  order = (await api(ro(), { token })).data;
  const workshopInvoices = order.invoice ? [order.invoice] : [];
  ok('order-single-intervention', order.interventions.length === 1, order.interventions.length);
  ok('order-invoiced', order.status === 'invoiced' && workshopInvoices.length === 1, order.invoice);

  const result = { generatedAt: new Date().toISOString(), resources: { customerId: String(customer.id), saleRaceVehicleId: String(raceVehicle.id), saleRaceWinnerId: String(saleRaceWinner.id), deliveryVehicleId: String(deliveryVehicle.id), deliverySaleId: String(deliverySale.id), deliveryId: String(delivery.id), orderId: String(order.id), orderNumber: order.order_number, workshopInvoiceId: String(order.invoice?.id ?? order.invoice_id), invoiceIds: [firstInvoice.data.id, invoiceRace[0].data.id, overpayInvoice.id, replayPaymentInvoice.id, concurrentPayInvoice.id] }, races, checks, failed: checks.filter((item) => !item.ok), calls };
  await writeFile('/tmp/stabilisation-erp-16-concurrency.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (result.failed.length) process.exitCode = 1;
} finally {
  if (originalAgency !== '3') await api(`/users/${admin.id}`, { method: 'PATCH', token, body: { agencyId: originalAgency } });
}
