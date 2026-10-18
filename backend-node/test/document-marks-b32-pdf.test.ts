import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import test from 'node:test';
import { renderCommercialDocument } from '../src/modules/documents/commercial-document.js';

let crcTable: number[] | null = null;
const crc = (buffer: Buffer) => {
  crcTable ??= Array.from({ length: 256 }, (_, n) => {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 255]! ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};
const chunk = (name: string, data: Buffer) => {
  const type = Buffer.from(name);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length);
  type.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc(Buffer.concat([type, data])), 8 + data.length);
  return output;
};
const png = (rgb: [number, number, number]) => {
  const width = 220;
  const height = 90;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = y * (width * 3 + 1) + 1 + x * 3;
    const border = x < 7 || y < 7 || x >= width - 7 || y >= height - 7;
    raw[offset] = border ? rgb[0] : 255;
    raw[offset + 1] = border ? rgb[1] : 255;
    raw[offset + 2] = border ? rgb[2] : 255;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

const identity = { legalName: 'LCA — Recette B.3.2', agencyName: 'Agence isolée', currencyCode: 'XAF' };
const header = { number: 'B32-001', document_date: '2026-10-18', customer_name: 'Client de recette', customer_code: 'B32', subtotal: 100000, discount_total: 0, tax_total: 18900, total: 118900, tax_rate_snapshot: 18.9, tax_mode: 'TAX_INCLUDED', currency_code: 'XAF' };
const line = { description: 'Véhicule de qualification documentaire', quantity: 1, unit_price: 100000, discount: 0, tax_rate: 18.9, line_total: 118900 };

test('B3.2 génère les cinq cas PDF avec et sans marques officielles', async () => {
  const output = '/tmp/pdfs/lca-b32';
  await mkdir(output, { recursive: true });
  const signature = png([26, 86, 160]);
  const stamp = png([143, 23, 34]);
  const cases = [
    ['A-cachet.pdf', [line], { stampBuffer: stamp, stampIdentity: 'Cachet officiel B.3.2' }],
    ['B-sans-cachet.pdf', [line], null],
    ['C-signature.pdf', [line], { signatureBuffer: signature, signatureIdentity: 'Validateur B.3.2' }],
    ['D-sans-signature.pdf', [line], null],
    ['E-multipage-marques.pdf', Array.from({ length: 36 }, (_, index) => ({ ...line, description: `Ligne documentaire ${index + 1} — contrôle de pagination et proportions` })), { signatureBuffer: signature, signatureIdentity: 'Validateur B.3.2', stampBuffer: stamp, stampIdentity: 'Cachet officiel B.3.2' }],
  ] as const;
  for (const [name, items, marks] of cases) {
    const pdf = await renderCommercialDocument('FACTURE', { ...header, number: name.replace('.pdf', '') } as any, [...items] as any, identity, null, 'CONTRACT_COMPACT', marks);
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.match(pdf.subarray(-64).toString('latin1'), /%%EOF/);
    await writeFile(`${output}/${name}`, pdf);
  }
});
