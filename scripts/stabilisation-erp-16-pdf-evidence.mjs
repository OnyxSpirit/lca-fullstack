import { mkdir, writeFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:3004/api';
const output = new URL('../tmp/pdfs/erp16/', import.meta.url);
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) throw new Error('Variables recette absentes');

const login = await fetch(`${base}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error(`Connexion impossible: ${login.status}`);
const { accessToken } = await login.json();

const documents = [
  ['facture-vehicule-13.pdf', '/invoices/13/pdf'],
  ['recu-paiement-11.pdf', '/payments/11/receipt'],
  ['bon-commande-vente-8.pdf', '/documents/business/sale/8/pdf'],
  ['pv-livraison-4.pdf', '/deliveries/4/pdf'],
  ['facture-atelier-14.pdf', '/invoices/14/pdf'],
  ['ordre-reparation-7.pdf', '/repair-orders/7/pdf'],
  ['facture-garantie-16.pdf', '/invoices/16/pdf'],
];

await mkdir(output, { recursive: true });
const evidence = [];
for (const [name, endpoint] of documents) {
  const response = await fetch(base + endpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('application/pdf')) {
    evidence.push({ name, endpoint, status: response.status, contentType, ok: false });
    continue;
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(new URL(name, output), bytes);
  evidence.push({ name, endpoint, status: response.status, contentType, bytes: bytes.length, ok: bytes.length > 1000 });
}

await writeFile(new URL('manifest.json', output), JSON.stringify({ generatedAt: new Date().toISOString(), documents: evidence }, null, 2));
console.log(JSON.stringify(evidence, null, 2));
if (evidence.some((item) => !item.ok)) process.exitCode = 1;
