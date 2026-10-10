import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const page=readFileSync(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');

test('OR24-FE-01 décision envoyée provient du bouton submit et non d’un setState asynchrone',()=>{assert.match(page,/submitter\?\.getAttribute\('value'\)==='approved'/);assert.match(page,/value="rejected"/);assert.match(page,/value="approved"/)});
test('OR24-FE-02 refus persistant est dérivé du contrat serveur',()=>assert.match(page,/customerRejected=ro\.customerApproval\.decision==='REJECTED'/));
test('OR24-FE-03 démarrer les travaux disparaît après refus',()=>assert.match(page,/!\(customerRejected&&next==='EN_COURS'\)/));
test('OR24-FE-04 message métier terminal est visible',()=>assert.match(page,/Le client a refusé les travaux[\s\S]*ne peut plus être mis en intervention/));
test('OR24-FE-05 actions atelier ne sont plus exécutables après refus',()=>assert.match(page,/workActive=ro\.status==='EN_COURS'&&!customerRejected/));
test('OR24-FE-06 refus survit au refresh sans état global partagé',()=>{assert.doesNotMatch(page,/useState\([^\n]*customerRejected/);assert.match(page,/ro\.approvals/)});
test('OR24-FE-07 refus avant travaux dépend de la décision serveur',()=>assert.match(page,/approvalActive=ro\.customerApproval\.canDecide/));
test('OR24-FE-08 garantie partielle ne modifie pas le verrou du refus',()=>assert.doesNotMatch(page,/customerRejected[^\n]*(PARTIAL|coverageMode)/));
