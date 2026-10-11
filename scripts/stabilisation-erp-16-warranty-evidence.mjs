import { writeFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:3004/api';
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error('Variables recette absentes');

async function request(path, { method = 'GET', token, body, binary = false } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (binary) {
    const data = Buffer.from(await response.arrayBuffer());
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`);
    return { data, contentType: response.headers.get('content-type') };
  }
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

const token = (await request('/auth/login', { method: 'POST', body: { email, password } })).accessToken;
const [customer, vehicle, sale, delivery, order, warranty, eligibility, activity, notifications, pdf] = await Promise.all([
  request('/customers/9/360', { token }),
  request('/vehicles/12', { token }),
  request('/sales/9', { token }),
  request('/deliveries/5', { token }),
  request('/repair-orders/7', { token }),
  request('/repair-orders/7/warranty', { token }),
  request('/repair-orders/vehicles/12/warranty-eligibility?mileage=55', { token }),
  request('/activity?page=1&pageSize=300', { token }),
  request('/notifications?scope=global&page=1&pageSize=300', { token }),
  request('/repair-orders/7/pdf', { token, binary: true }),
]);
const result = {
  generatedAt: new Date().toISOString(), customer, vehicle, sale, delivery, order, warranty, eligibility,
  activityTotal: activity.pagination?.total ?? activity.total,
  notifications: (notifications.items ?? []).filter((item) => ['7', '9', '12'].includes(String(item.referenceId))),
  pdf: { contentType: pdf.contentType, bytes: pdf.data.length, signature: pdf.data.subarray(0, 5).toString() },
};
await writeFile('/tmp/stabilisation-erp-16-warranty-evidence.json', JSON.stringify(result, null, 2));
await writeFile('/tmp/stabilisation-erp-16-warranty-or-7.pdf', pdf.data);
console.log(JSON.stringify({
  customerId: customer.id, vehicleId: vehicle.id, vehicleStatus: vehicle.status, mileage: vehicle.mileage,
  saleId: sale.id, saleStatus: sale.status, warrantyStatus: sale.warranty_status,
  deliveryId: delivery.id, deliveryStatus: delivery.status,
  orderId: order.id, orderNumber: order.order_number, orderStatus: order.status,
  eligibility: eligibility.status, decision: warranty.decision_status, coverage: warranty.coverage_mode,
  allocation: warranty.allocation_status, claim: warranty.claim,
  customerInvoiceId: order.invoice_id, pdf: result.pdf,
  notifications: result.notifications.length, activityTotal: result.activityTotal,
}, null, 2));
