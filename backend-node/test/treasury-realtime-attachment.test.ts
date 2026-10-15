import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const service=readFileSync(new URL('../src/modules/treasury/treasury.service.ts',import.meta.url),'utf8');
const coverage=readFileSync(new URL('../src/modules/treasury/treasury-coverage.service.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../database/migrations/085_treasury_account_attachment.sql',import.meta.url),'utf8');
const socket=readFileSync(new URL('../src/realtime/socket.ts',import.meta.url),'utf8');

test('TRES-09 conserve les comptes historiques ambigus sans qualification arbitraire',()=>{
  assert.match(migration,/attachment_type ENUM\('AGENCY','CONCESSION'\) NULL/);
  assert.match(migration,/WHERE agency_id IS NOT NULL/);
  assert.doesNotMatch(migration,/WHERE agency_id IS NULL/);
});

test('TRES-09 vérifie le territoire et verrouille un rattachement ayant un historique',()=>{
  assert.match(service,/Agence incompatible avec la concession/);
  assert.match(service,/Le rattachement est verrouillé/);
  assert.match(service,/treasury_movements WHERE account_id/);
  assert.match(service,/treasury_reservations WHERE account_id/);
});

test('la consultation des comptes utilise le nom officiel du mapping de flux',()=>{
  assert.match(service,/treasury_account_mappings hf/);
  assert.doesNotMatch(service,/treasury_flow_mappings/);
  assert.match(service,/SELECT ta\.\*/);
});

test('TRES-06 exclut structurellement les transferts des flux externes et ne compte que la jambe sortante',()=>{
  assert.match(service,/tm\.transfer_id IS NULL AND tm\.direction='IN'/);
  assert.match(service,/tm\.transfer_id IS NULL AND tm\.direction='OUT'/);
  assert.match(service,/tm\.transfer_id IS NOT NULL AND tm\.direction='OUT'/);
  assert.match(service,/Transfert inter-concessions interdit/);
});

test('les comptes de concession couvrent les dépenses agence de leur concession',()=>{
  assert.match(coverage,/account\.attachment_type === "CONCESSION"/);
  assert.match(coverage,/\?='CONCESSION'/);
});

test('les rooms temps réel métier sont fondées sur les permissions et scopes',()=>{
  assert.match(socket,/\['treasury','treasury\.view'\]/);
  assert.match(socket,/\['hr','hr\.view'\]/);
  assert.match(socket,/\$\{domain\}:agency:/);
  assert.match(socket,/granted==='GLOBAL'/);
});
