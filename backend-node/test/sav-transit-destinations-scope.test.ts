import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/modules/workshop/sav-operations.routes.ts',import.meta.url),'utf8');

test('SAV-TRANSIT-DEST-01 utilise la clé réelle de la table agencies pour le scope',()=>{
 assert.match(source,/agencyScope=.*agency:`\$\{alias\}\.id`/);
 assert.match(source,/agencyScope\(req,'service\.transit\.view','a'\)/);
 assert.doesNotMatch(source,/scope\(req,'service\.transit\.view','a'\)/);
});

test('SAV-TRANSIT-DEST-02 conserve tous les filtres comptables',()=>{
 for(const token of['m.agency_id=?','m.payment_method_id=?','m.is_active=TRUE','ta.is_active=TRUE','ta.concession_id=a.concession_id','ta.agency_id IS NULL OR ta.agency_id=a.id'])assert.ok(source.includes(token),token);
});
