import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const base = 'http://127.0.0.1:3004/api';
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const userPassword = process.env.RECETTE_USER_PASSWORD;
if (!adminEmail || !adminPassword || !userPassword) throw new Error('Variables recette absentes');

const timings = [];
const checks = [];
const ok = (name, value, detail) => checks.push({ name, ok: Boolean(value), detail });
async function call(path, { method = 'GET', token, body, expected = [200], binary = false } = {}) {
  const started = performance.now();
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  timings.push({ method, path, status: response.status, ms: Math.round((performance.now() - started) * 100) / 100 });
  if (binary) {
    const data = Buffer.from(await response.arrayBuffer());
    if (!expected.includes(response.status)) throw new Error(`${method} ${path}: ${response.status}`);
    return { status: response.status, data, headers: Object.fromEntries(response.headers) };
  }
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw: raw.slice(0, 500) }; }
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return { status: response.status, data };
}
const login = async (email, password = userPassword) => (await call('/auth/login', { method: 'POST', body: { email, password } })).data.accessToken;
const admin = await login(adminEmail, adminPassword);
const users = (await call('/users', { token: admin })).data;
const adminUser = users.find((user) => user.email === adminEmail);
const originalAdminAgency = String(adminUser.agencyId);
const commercial = users.find((user) => user.email === 'recette.commercial@lca-test.cg');
const deliveryUser = users.find((user) => user.email === 'recette.responsable_livraison@lca-test.cg');
if (!commercial || !deliveryUser) throw new Error('Acteurs agence 3 absents');

try {
  if (originalAdminAgency !== '3') await call(`/users/${adminUser.id}`, { method: 'PATCH', token: admin, body: { agencyId: '3' } });
  ok('auth-required', (await call('/repair-orders', { expected: [401] })).status === 401);

  let customers = (await call('/customers?search=REC16&page=1&pageSize=100', { token: admin })).data;
  let customer = (customers.items ?? customers).find((item) => item.email === 'rec16.gar.client@example.test');
  if (!customer) customer = (await call('/customers', { method: 'POST', token: admin, body: {
    agencyId: '3', customerType: 'individual', firstName: 'Garantie', lastName: 'REC16',
    email: 'rec16.gar.client@example.test', phone: '+2420616000001', city: 'Brazzaville',
    classification: 'regular', source: 'ERP-16', notes: 'REC16-GAR-01 cycle constructeur complet',
  }, expected: [201] })).data;
  ok('customer-persisted', Boolean((await call(`/customers/${customer.id}/360`, { token: admin })).data));

  const references = (await call('/vehicle-references?agencyId=3', { token: admin })).data;
  const brand = references.brands.find((item) => String(item.name).toLowerCase() === 'hyundai') ?? references.brands[0];
  let providers = (await call('/settings/manufacturers', { token: admin })).data.providers;
  let provider = providers.find((item) => item.code === 'REC16-GAR');
  if (!provider) provider = (await call('/settings/manufacturers', { method: 'POST', token: admin, body: {
    name: 'Constructeur REC16 Garantie', code: 'REC16-GAR', defaultWarrantyMonths: 36,
    defaultMileageLimit: 100000, warrantyAvailable: true, brandIds: [String(brand.id)],
  }, expected: [201] })).data;

  let locations = (await call('/vehicle-locations?targetAgency=3&active=true', { token: admin })).data;
  let location = locations.find((item) => String(item.agency_id ?? item.agencyId) === '3' && ['PARC', 'SHOWROOM'].includes(String(item.type).toUpperCase())) ?? locations[0];
  if (!location) location = (await call('/vehicle-locations', { method: 'POST', token: admin, body: { agencyId: '3', name: 'Parc REC16 A3', type: 'PARC' }, expected: [201] })).data;
  let vehicles = (await call('/vehicles?search=REC16&view=all&page=1&pageSize=100', { token: admin })).data.items ?? [];
  let vehicle = vehicles.find((item) => item.vin === 'REC16VN0000000001');
  if (!vehicle) vehicle = (await call('/vehicles', { method: 'POST', token: admin, body: {
    vin: 'REC16VN0000000001', brand: brand.name, model: 'Tucson', version: 'REC16', vehicleType: 'new', year: 2026,
    color: 'Bleu', fuelType: 'Essence', transmission: 'Automatique', mileage: 40, purchasePrice: 18000000,
    catalogPrice: 26000000, salePrice: 25000000, minimumPrice: 24000000, status: 'available', agencyId: '3',
    locationId: String(location.id), bodyType: 'SUV', notes: 'REC16-GAR-01 véhicule neuf garantie applicable',
  }, expected: [201] })).data;
  const proposal = (await call(`/vehicles/${vehicle.id}/warranty-proposal`, { token: admin })).data;
  ok('warranty-proposal', proposal.applicable && String(proposal.providerId) === String(provider.id), proposal);

  let sales = (await call(`/sales?customerId=${customer.id}`, { token: admin })).data;
  let sale = (sales.items ?? sales).find((item) => String(item.vehicle_id) === String(vehicle.id) && item.status !== 'cancelled');
  if (!sale) sale = (await call('/sales', { method: 'POST', token: admin, body: {
    customerId: String(customer.id), vehicleId: String(vehicle.id), agencyId: '3', salespersonId: String(commercial.id),
    discount: 0, depositAmount: 0, taxMode: 'TAXABLE', priceInputMode: 'HT', notes: 'REC16-GAR-01 vente garantie applicable',
    idempotencyKey: `REC16-GAR-SALE-${randomUUID()}`, warranty: { decision: 'APPLICABLE', durationMonths: 36, mileageLimit: 100000 },
  }, expected: [201] })).data;
  const setSaleStatus = async (status) => { sale = (await call(`/sales/${sale.id}/status`, { method: 'PATCH', token: admin, body: { status } })).data; };
  sale = (await call(`/sales/${sale.id}`, { token: admin })).data;
  if (sale.status === 'reserved') await setSaleStatus('ordered');
  if (sale.status === 'ordered') await setSaleStatus('confirmed');

  let invoice = sale.invoice_id ? (await call(`/invoices/${sale.invoice_id}`, { token: admin })).data : null;
  if (!invoice) invoice = (await call('/invoices', { method: 'POST', token: admin, body: {
    agencyId: '3', customerId: String(customer.id), saleId: String(sale.id), invoiceType: 'vehicle',
    issueDate: new Date().toISOString().slice(0, 10), notes: 'REC16-GAR-01 facture véhicule', idempotencyKey: `REC16-GAR-INV-${randomUUID()}`,
    items: [{ vehicleId: String(vehicle.id), description: `${brand.name} Tucson REC16`, quantity: 1, unitPrice: Number(sale.total), discount: 0 }],
  }, expected: [201] })).data;
  if (invoice.status === 'draft' || !invoice.invoice_number) {
    await call(`/invoices/${invoice.id}/status`, { method: 'PATCH', token: admin, body: { status: 'issued' } });
    invoice = (await call(`/invoices/${invoice.id}`, { token: admin })).data;
  }
  const paymentMethods = (await call('/invoices/payment-methods', { token: admin })).data;
  const cash = paymentMethods.find((item) => item.code === 'CASH') ?? paymentMethods[0];
  let salePayments = (await call(`/invoices/${invoice.id}/payments`, { token: admin })).data;
  let salePayment = salePayments.find((item) => String(item.notes ?? '').includes('REC16')) ?? salePayments[0];
  if (!salePayment && Number(invoice.balance_due) > 0) salePayment = (await call(`/invoices/${invoice.id}/payments`, { method: 'POST', token: admin, body: {
    paymentMethodId: String(cash.id), amount: Number(invoice.balance_due), notes: 'REC16-GAR-01 règlement véhicule',
    reference: cash.requires_reference ? 'REC16-GAR-SALE-PAY' : null, idempotencyKey: `REC16-GAR-PAY-${randomUUID()}`,
  }, expected: [200, 201] })).data;
  invoice = (await call(`/invoices/${invoice.id}`, { token: admin })).data;
  ok('sale-invoice-paid', invoice.status === 'paid' && Number(invoice.balance_due) === 0);
  sale = (await call(`/sales/${sale.id}`, { token: admin })).data;
  if (sale.status === 'confirmed') await setSaleStatus('preparation');
  if (sale.status === 'preparation') await setSaleStatus('ready_for_delivery');

  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setUTCHours(10, 0, 0, 0);
  let deliveries = (await call('/deliveries', { token: admin })).data;
  let delivery = (deliveries.items ?? deliveries).find((item) => String(item.sale_id) === String(sale.id) && item.status !== 'cancelled');
  if (!delivery) delivery = (await call('/deliveries', { method: 'POST', token: admin, body: {
    saleId: String(sale.id), deliverySpecialistId: String(deliveryUser.id), scheduledAt: tomorrow.toISOString(),
    deliveryLocation: 'Agence REC16 A3', customerNotes: 'REC16-GAR-01 activation garantie',
  }, expected: [201] })).data;
  function crc32(buffer) { let value = 0xffffffff; for (const byte of buffer) { value ^= byte; for (let index = 0; index < 8; index++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); } return (value ^ 0xffffffff) >>> 0; }
  function chunk(type, data) { const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4); length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([length, name, data, crc]); }
  function signaturePng() { const width = 120, height = 40, raw = Buffer.alloc((width * 4 + 1) * height, 255); for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; for (let x = 0; x < width; x++) { const offset = y * (width * 4 + 1) + 1 + x * 4; if (Math.abs(y - (20 + Math.sin(x / 8) * 8)) < 2) raw.fill(15, offset, offset + 3); raw[offset + 3] = 255; } } const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6; return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
  let deliveryDetail = (await call(`/deliveries/${delivery.id}`, { token: admin })).data;
  if (deliveryDetail.status === 'planned') deliveryDetail = (await call(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token: admin, body: { status: 'preparing' } })).data;
  if (deliveryDetail.status === 'preparing') deliveryDetail = (await call(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token: admin, body: { status: 'quality_control' } })).data;
  for (const item of deliveryDetail.checklist.filter((entry) => !entry.completed_at)) await call(`/deliveries/${delivery.id}/checklist/${item.id}`, { method: 'PATCH', token: admin, body: { completed: true, notes: 'REC16-GAR-01 conforme' } });
  deliveryDetail = (await call(`/deliveries/${delivery.id}`, { token: admin })).data;
  if (deliveryDetail.status === 'quality_control') deliveryDetail = (await call(`/deliveries/${delivery.id}/status`, { method: 'PATCH', token: admin, body: { status: 'ready' } })).data;
  if (deliveryDetail.status === 'ready') deliveryDetail = (await call(`/deliveries/${delivery.id}/sign`, { method: 'POST', token: admin, body: {
    signerName: 'Garantie REC16', signatureData: `data:image/png;base64,${signaturePng().toString('base64')}`,
    consentText: 'Livraison REC16-GAR-01 acceptée', mileageAtDelivery: 45,
  }, expected: [200, 201] })).data;
  sale = (await call(`/sales/${sale.id}`, { token: admin })).data;
  ok('delivery-official', deliveryDetail.status === 'delivered' && sale.status === 'delivered');
  ok('contract-active', sale.warranty_status === 'ACTIVE', sale.warranty_status);

  const eligibility = (await call(`/repair-orders/vehicles/${vehicle.id}/warranty-eligibility?mileage=50`, { token: admin })).data;
  ok('eligible-contractually', eligibility.status === 'ELIGIBLE_CONTRACTUALLY', eligibility);
  const advisor = (await call('/repair-orders/advisor-candidates?targetAgency=3', { token: admin })).data[0];
  let repairOrders = (await call('/repair-orders?page=1&pageSize=100', { token: admin })).data.items;
  let order = repairOrders.find((item) => item.complaint === 'REC16-GAR-01');
  if (!order) order = (await call('/repair-orders', { method: 'POST', token: admin, body: {
    customerId: String(customer.id), vehicleId: String(vehicle.id), advisorId: String(advisor.id), mileage: 50,
    complaint: 'REC16-GAR-01', diagnosisSummary: 'Défaut couvert par le contrat constructeur actif', promisedCompletionAt: '2026-10-20 17:00:00',
  }, expected: [201] })).data;
  const route = (suffix = '') => `/repair-orders/${order.id}${suffix}`;
  order = (await call(route(), { token: admin })).data;
  let warranty = (await call(route('/warranty'), { token: admin })).data;
  if (!warranty) warranty = (await call(route('/warranty'), { method: 'PUT', token: admin, body: { expectedVersion: 0, warrantyReference: 'REC16-GAR-AUTORISATION', comment: 'REC16-GAR-01 demande officielle' } })).data;
  if (warranty.decision_status === 'PENDING') warranty = (await call(route('/warranty/decision'), { method: 'POST', token: admin, body: {
    decision: 'APPROVED', mode: 'FULL', providerId: String(provider.id), authorizationReference: 'REC16-GAR-AUTORISATION',
    reason: 'Défaut contractuellement couvert', expectedVersion: Number(warranty.version),
  } })).data;
  if (order.status === 'planned') {
    await call(route('/inspection'), { method: 'POST', token: admin, body: { fuelLevel: 'Plein', cleanliness: 'Propre', mileage: 50, observations: 'REC16-GAR-01 réception' } });
    order = (await call(route('/status'), { method: 'PATCH', token: admin, body: { status: 'received' } })).data;
  }
  if (order.status === 'received') order = (await call(route('/status'), { method: 'PATCH', token: admin, body: { status: 'diagnosis' } })).data;
  const technician = (await call(route('/technician-candidates'), { token: admin })).data[0];
  if (!order.diagnostics.length) order = (await call(route('/diagnostics'), { method: 'POST', token: admin, body: {
    technicianId: String(technician.id), diagnosis: 'Défaut de calibrage électronique couvert REC16',
    recommendations: 'Recalibrage complet sous garantie constructeur', estimatedHours: 1,
  }, expected: [201] })).data;
  if (!order.estimateItems.length) order = (await call(route('/estimate-items'), { method: 'POST', token: admin, body: {
    itemType: 'labor', description: 'Recalibrage électronique garantie REC16', quantity: 1, rateCode: 'T1', requestKey: 'REC16-GAR-EST',
  }, expected: [201] })).data;
  if (order.status === 'diagnosis') order = (await call(route('/status'), { method: 'PATCH', token: admin, body: { status: 'waiting_approval' } })).data;
  if (!order.approvals.length) order = (await call(route('/approval'), { method: 'POST', token: admin, body: { approved: true, customerName: 'Garantie REC16', notes: 'Couverture constructeur confirmée' }, expected: [201] })).data;
  if (order.status === 'waiting_approval') order = (await call(route('/status'), { method: 'PATCH', token: admin, body: { status: 'in_progress' } })).data;
  let intervention = order.interventions[0];
  if (!intervention) { order = (await call(route(`/estimate-items/${order.estimateItems[0].id}/intervention`), { method: 'POST', token: admin, body: {}, expected: [201] })).data; intervention = order.interventions[0]; }
  if (intervention.status === 'planned') {
    if (!order.schedules.some((item) => String(item.intervention_id) === String(intervention.id))) await call(route('/assign'), { method: 'POST', token: admin, body: { technicianId: String(technician.id), interventionId: String(intervention.id), startsAt: '2026-10-20 09:00:00', endsAt: '2026-10-20 10:00:00', notes: 'REC16-GAR-01' }, expected: [201] });
    const session = (await call(route('/sessions/start'), { method: 'POST', token: admin, body: { technicianId: String(technician.id), interventionId: String(intervention.id) }, expected: [201] })).data;
    order = (await call(route(`/sessions/${session.id}/stop`), { method: 'PATCH', token: admin, body: {} })).data;
    intervention = order.interventions.find((item) => String(item.id) === String(intervention.id));
  }
  if (intervention.status !== 'completed') order = (await call(route(`/interventions/${intervention.id}/status`), { method: 'PATCH', token: admin, body: { status: 'completed' } })).data;
  if (!order.items.length) order = (await call(route('/items'), { method: 'POST', token: admin, body: { itemType: 'labor', interventionId: String(intervention.id), estimateItemId: String(order.estimateItems[0].id), quantity: 1, requestKey: 'REC16-GAR-ACT' }, expected: [201] })).data;
  warranty = (await call(route('/warranty'), { token: admin })).data;
  if (warranty.allocation_status !== 'CONFIRMED') {
    warranty = (await call(route('/warranty/allocations'), { method: 'PUT', token: admin, body: { expectedVersion: Number(warranty.version), allocations: order.items.filter((item) => item.status === 'active').map((item) => ({ repairOrderItemId: String(item.id), manufacturerShareHT: Number(item.line_total) })) } })).data;
    warranty = (await call(route('/warranty/confirm'), { method: 'POST', token: admin, body: { expectedVersion: Number(warranty.version) } })).data;
  }
  if (order.status === 'in_progress') order = (await call(route('/status'), { method: 'PATCH', token: admin, body: { status: 'quality_control' } })).data;
  if (order.status === 'quality_control' && !order.qualityControls.length) order = (await call(route('/quality-control'), { method: 'POST', token: admin, body: { result: 'passed', plannedWorkCompleted: true, defectCorrected: true, roadTestPerformed: true, noLeaks: true, levelsChecked: true, cleanlinessChecked: true, observations: 'QC REC16-GAR-01 conforme' }, expected: [201] })).data;
  if (order.status === 'quality_control') order = (await call(route('/status'), { method: 'PATCH', token: admin, body: { status: 'ready' } })).data;
  if (order.status === 'ready') await call(route('/invoice'), { method: 'POST', token: admin, body: {}, expected: [201] });
  order = (await call(route(), { token: admin })).data;
  warranty = (await call(route('/warranty'), { token: admin })).data;
  let claimPayment = warranty.claim?.payments?.[0];
  if (warranty.claim && Number(warranty.claim.balance_due) > 0) claimPayment = (await call(`/warranty-claims/${warranty.claim.id}/payments`, { method: 'POST', token: admin, body: { paymentMethodId: String(cash.id), amount: Number(warranty.claim.balance_due), requestKey: 'REC16-GAR-CLAIM-PAY', reference: 'REC16-CONSTRUCTEUR' }, expected: [200, 201] })).data;
  warranty = (await call(route('/warranty'), { token: admin })).data;
  if (order.status === 'invoiced') order = (await call(route('/handover'), { method: 'POST', token: admin, body: { customerName: 'Garantie REC16', mileageOut: 55, observations: 'REC16-GAR-01 restitution conforme', signatureData: 'data:image/png;base64,AA==' }, expected: [201] })).data;
  order = (await call(route(), { token: admin })).data;
  vehicle = (await call(`/vehicles/${vehicle.id}`, { token: admin })).data;
  const customerInvoice = order.invoice_id ? (await call(`/invoices/${order.invoice_id}`, { token: admin })).data : null;
  const activity = (await call('/activity?page=1&pageSize=300', { token: admin })).data;
  const notifications = (await call('/notifications?scope=global&page=1&pageSize=300', { token: admin })).data;
  const pdf = await call(`/repair-orders/${order.id}/pdf`, { token: admin, binary: true, expected: [200] });
  ok('full-allocation-confirmed', warranty.allocation_status === 'CONFIRMED');
  ok('manufacturer-amount-positive', Number(warranty.claim?.total_amount ?? 0) > 0, warranty.claim?.total_amount);
  ok('customer-amount-zero', Number(customerInvoice?.total ?? warranty.customer_total ?? 0) === 0, customerInvoice?.total ?? warranty.customer_total);
  ok('claim-settled', Number(warranty.claim?.balance_due ?? 0) === 0, warranty.claim);
  ok('handover-complete', order.status === 'delivered' && Number(vehicle.mileage) >= 55);
  ok('repair-order-pdf', pdf.headers['content-type']?.includes('application/pdf') && pdf.data.subarray(0, 5).toString() === '%PDF-' && pdf.data.length > 1000, { bytes: pdf.data.length });
  const result = {
    generatedAt: new Date().toISOString(),
    resources: { customerId: String(customer.id), vehicleId: String(vehicle.id), saleId: String(sale.id), saleInvoiceId: String(invoice.id), salePaymentId: String(salePayment?.id), deliveryId: String(delivery.id), providerId: String(provider.id), repairOrderId: String(order.id), repairOrderNumber: order.order_number, workshopInvoiceId: String(order.invoice_id), warrantyClaimId: String(warranty.claim?.id), claimPaymentId: String(claimPayment?.id), agencyId: '3' },
    final: { customer, vehicle, sale, saleInvoice: invoice, delivery: deliveryDetail, eligibility, repairOrder: order, warranty, customerInvoice },
    evidence: { activityTotal: activity.pagination?.total ?? activity.total, notifications: (notifications.items ?? []).filter((item) => String(item.referenceId) === String(order.id) || String(item.referenceId) === String(sale.id)), repairOrderPdfBytes: pdf.data.length },
    checks, failed: checks.filter((item) => !item.ok), timings,
  };
  await writeFile('/tmp/stabilisation-erp-16-warranty.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (result.failed.length) process.exitCode = 1;
} finally {
  if (originalAdminAgency !== '3') await call(`/users/${adminUser.id}`, { method: 'PATCH', token: admin, body: { agencyId: originalAdminAgency } });
}
