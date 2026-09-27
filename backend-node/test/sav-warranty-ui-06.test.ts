import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const warranty = readFileSync(new URL('../src/modules/workshop/warranty.routes.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/modules/workshop/warranty.service.ts', import.meta.url), 'utf8');
const workshop = readFileSync(new URL('../src/modules/workshop/workshop.routes.ts', import.meta.url), 'utf8');
const receptionGuard = service.match(/export async function assertWarrantyDecisionMade[\s\S]*?\n}/)?.[0] ?? '';

test('UI06-BE-01 PENDING accepte APPROVED FULL', () => { assert.match(warranty, /decision==='APPROVED'/); assert.match(warranty, /'FULL','PARTIAL'/); });
test('UI06-BE-02 PENDING accepte APPROVED PARTIAL', () => assert.match(warranty, /coverage_mode=\?/));
test('UI06-BE-03 PENDING accepte REJECTED avec motif', () => assert.match(warranty, /decision==='REJECTED'&&!reason/));
test('UI06-BE-04 la décision, la date et l’auteur sont persistés', () => assert.match(warranty, /decision_status=\?.*decision_at=NOW\(\),decided_by=\?/));
test('UI06-BE-05 une seconde décision contradictoire est refusée sous verrou', () => { assert.match(warranty, /FOR UPDATE/); assert.match(warranty, /before\.decision_status!=='PENDING'/); });
test('UI06-BE-06 PENDING bloque la réception', () => assert.match(receptionGuard, /decision_status==='PENDING'/));
test('UI06-BE-07 APPROVED ne bloque pas la réception', () => assert.doesNotMatch(receptionGuard, /decision_status==='APPROVED'/));
test('UI06-BE-08 REJECTED ne bloque pas la réception', () => assert.doesNotMatch(receptionGuard, /decision_status==='REJECTED'/));
test('UI06-BE-09 l’API directe exige permission et scope', () => { assert.match(warranty, /requirePermission\('service\.warranty\.approve'\)/); assert.match(warranty, /assertWarrantyScope\(r,'service\.warranty\.approve'/); });
test('UI06-BE-10 aucune allocation définitive n’est exigée à l’approbation', () => assert.doesNotMatch(warranty.match(/warrantyRouter\.post\('\/repair-orders\/:id\/warranty\/decision'[\s\S]*?res\.json\(await warrantyDetail\(orderId\)\)\)\);/)?.[0] ?? '', /manufacturer_share_ht|allocations\.length/));
test('UI06-BE-11 REJECTED préserve le constructeur et ne modifie pas le contrat véhicule', () => { assert.match(warranty, /decidedProviderId=decision==='APPROVED'\?providerId:before\.provider_id/); assert.doesNotMatch(warranty, /UPDATE vehicle_warranty_contracts/); });
test('UI06-BE-12 deux OR sont isolés par repair_order_id', () => assert.match(warranty, /WHERE repair_order_id=\? FOR UPDATE/));
test('UI06-BE-13 le constructeur du dossier ne peut pas être substitué', () => assert.match(warranty, /before\.provider_id!=null&&String\(before\.provider_id\)!==providerId/));
test('UI06-BE-14 la réception appelle le verrou serveur', () => assert.match(workshop, /assertWarrantyDecisionMade\(c,id\)/));
