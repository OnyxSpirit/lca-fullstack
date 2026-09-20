import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {validateAgency,validateConcession,validateSettings} from '../src/modules/settings/setting.service.js';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const routes=source('src/modules/settings/setting.routes.ts');
const service=source('src/modules/settings/setting.service.ts');
const resolver=source('src/modules/settings/setting-resolver.ts');

test('SETTINGS-01 lecture et écriture utilisent des permissions distinctes',()=>{
  assert.match(routes,/get\('\/settings',requirePermission\('settings\.view'\)/);
  assert.match(routes,/put\('\/settings',requirePermission\('settings\.update'\)/);
  assert.match(routes,/patch\('\/concessions\/current',requirePermission\('settings\.update'\)/);
});

test('SETTINGS-02 OWN est refusé pour les paramètres collectifs',()=>{
  assert.match(service,/scope === "OWN" \|\| scope == null/);
  assert.match(service,/scope OWN ne permet pas de consulter/);
});

test('SETTINGS-03 une écriture concession exige CONCESSION ou GLOBAL',()=>{
  assert.match(service,/scope !== "CONCESSION" && scope !== "GLOBAL"/);
  assert.match(service,/export async function update[\s\S]*?assertConcessionWrite\(r\)/);
  assert.match(service,/export async function updateConcession[\s\S]*?assertConcessionWrite\(r\)/);
});

test('SETTINGS-04 AGENCY ne peut modifier que sa propre agence',()=>{
  assert.match(service,/scope === "AGENCY" && String\(row\.id\) === String\(r\.user!\.agencyId\)/);
  assert.match(service,/Agence hors du scope settings\.update/);
});

test('SETTINGS-05 CONCESSION compare la concession persistée et ignore concessionId hors GLOBAL',()=>{
  assert.match(service,/String\(row\.concession_id\) === \(await currentConcessionId\(r\)\)/);
  assert.match(service,/scope === "GLOBAL" && v\.concessionId/);
});

test('SETTINGS-06 validation métier refuse taux, nombres et forme invalides',()=>{
  assert.throws(()=>validateSettings(null),/Configuration invalide/);
  assert.throws(()=>validateSettings({billing:{defaultVatRate:101},workshop:{rates:{T1:1,T2:1,T3:1,T4:1}}}),/TVA/);
  assert.throws(()=>validateSettings({billing:{defaultVatRate:18.9},workshop:{rates:{T1:-1,T2:1,T3:1,T4:1}}}),/Tarif T1/);
  assert.throws(()=>validateSettings({billing:{defaultVatRate:Number.NaN},workshop:{rates:{T1:1,T2:1,T3:1,T4:1}}}),/TVA/);
});

test('SETTINGS-07 devise, timezone et email sont validés côté backend',()=>{
  const valid={name:'LCA',legalName:null,taxIdentifier:null,address:null,city:null,country:'Congo',currencyCode:'XAF',timezone:'Africa/Brazzaville'};
  assert.equal(validateConcession(valid).currencyCode,'XAF');
  assert.throws(()=>validateConcession({...valid,currencyCode:'ZZZ'}),/Devise/);
  assert.throws(()=>validateConcession({...valid,timezone:'Mars\/Olympus'}),/Fuseau/);
  assert.throws(()=>validateAgency({name:'A',code:'A',email:'invalide'},true),/Email/);
});

test('SETTINGS-08 mass assignment est bloqué par des payloads reconstruits',()=>{
  assert.deepEqual(Object.keys(validateSettings({billing:{defaultVatRate:20},workshop:{rates:{T1:1,T2:2,T3:3,T4:4}},scopeId:999} as any)).sort(),['billing','workshop']);
  assert.doesNotMatch(service,/UPDATE settings SET \$\{|Object\.entries\(body\)/);
  assert.match(service,/r\.user!\.sub/);
});

test('SETTINGS-09 résolution hiérarchique agence puis concession puis global',()=>{
  assert.match(resolver,/scope_type='agency'/);
  assert.match(resolver,/scope_type='concession'/);
  assert.match(resolver,/scope_type='global'/);
  assert.match(resolver,/FIELD\(scope_type,'agency','concession','global'\)/);
});

test('SETTINGS-10 TVA, devise et barèmes sont consommés par Billing et Atelier',()=>{
  const billing=source('src/modules/billing/billing.routes.ts'),workshop=source('src/modules/workshop/workshop.routes.ts');
  assert.match(billing,/getEffectiveBusinessSettings/);
  assert.match(billing,/lines\(r\.body\.items,config\.vatRate\)/);
  assert.match(billing,/currency_code[\s\S]*config\.currencyCode/);
  assert.match(workshop,/getEffectiveBusinessSettings/);
  assert.match(workshop,/businessConfig\.rates\[rateCode/);
  assert.match(workshop,/businessConfig\.currencyCode/);
});

test('SETTINGS-11 écritures groupées et audit sont transactionnels',()=>{
  assert.match(service,/export async function update[\s\S]*?await transaction/);
  assert.match(service,/settings\.updated/);
  assert.match(service,/concession\.updated/);
  assert.match(service,/FOR UPDATE/);
});

test('SETTINGS-12 aucun rôle historique ni secret infrastructure ne gouverne Settings',()=>{
  for(const role of ['DIRECTOR','DIRECTION','MANAGER','ADMIN','ACCOUNTANT','RECEPTIONIST'])assert.doesNotMatch(service,new RegExp(role));
  assert.doesNotMatch(service,/JWT|DB_PASSWORD|SMTP|private.?key/i);
});

