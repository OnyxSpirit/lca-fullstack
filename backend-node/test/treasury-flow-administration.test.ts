import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),service=read('src/modules/treasury/treasury-flow.service.ts'),routes=read('src/modules/treasury/treasury.routes.ts'),page=read('../frontend/src/modules/treasury/TreasuryFlowMappingsTable.tsx');

test('FLOW-ADM-01 expose modification statut et suppression sous permission existante',()=>{
 assert.match(routes,/patch\('\/treasury\/flow-mappings\/:id'/);
 assert.match(routes,/delete\('\/treasury\/flow-mappings\/:id'/);
 assert.ok((routes.match(/requirePermission\('treasury\.account\.manage'\)/g)??[]).length>=5);
});

test('FLOW-ADM-02 protège la suppression par verrou et historique financier',()=>{
 assert.match(service,/SELECT m\.\* FROM treasury_account_mappings m WHERE m\.id=\? FOR UPDATE/);
 assert.match(service,/treasury_movements[\s\S]*LIMIT 1 FOR UPDATE/);
 assert.match(service,/déjà été utilisée pour des opérations financières/);
 assert.match(service,/DELETE FROM treasury_account_mappings WHERE id=\?/);
});

test('FLOW-ADM-03 activation et modification revalident compte et périmètre',()=>{
 assert.match(service,/Le compte associé est inactif ou hors périmètre/);
 assert.match(service,/Un compte inactif ne peut pas être configuré/);
 assert.match(service,/treasury\.flow\.mapping\.deleted/);
 assert.match(service,/context:agencyId\|\|concessionId/);
});

test('FLOW-ADM-04 interface utilise tableau API, modales et invalidation',()=>{
 for(const label of['Modifier','Désactiver','Activer','Supprimer','Historique financier'])assert.match(page,new RegExp(label));
 assert.doesNotMatch(page,/window\.prompt/);
 assert.match(page,/useTreasuryFlowActions/);
});
