import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const page=readFileSync(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');
const hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');
const types=readFileSync(new URL('../src/types/index.ts',import.meta.url),'utf8');

test('OR25-FE-01 premier rendu et remount utilisent canDecide serveur',()=>assert.match(page,/approvalActive=ro\.customerApproval\.canDecide/));
test('OR25-FE-02 Accepter et Refuser existent dans le formulaire reconstructible',()=>{assert.match(page,/>Refuser<\/Button>/);assert.match(page,/>Valider les travaux<\/Button>/)});
test('OR25-FE-03 démarrage exige une acceptation persistée',()=>assert.match(page,/next==='EN_COURS'&&ro\.customerApproval\.decision!=='APPROVED'/));
test('OR25-FE-04 acceptation et refus affichés proviennent des approvals API',()=>{assert.match(hooks,/approvals:\(r\.approvals\?\?\[\]\)\.map/);assert.match(page,/ro\.approvals\?\.map/)});
test('OR25-FE-05 refus reste terminal après reconstruction',()=>assert.match(page,/customerRejected=ro\.customerApproval\.decision==='REJECTED'/));
test('OR25-FE-06 brouillon local ne pilote pas existence étape',()=>assert.doesNotMatch(page,/approvalActive=approval\./));
test('OR25-FE-07 changement OR recharge une query indexée par id',()=>assert.match(hooks,/queryKey: \["repair-orders", id\]/));
test('OR25-FE-08 montant est fourni par le contrat serveur',()=>assert.match(page,/money\(ro\.customerApproval\.submittedAmount\)/));
test('OR25-FE-09 Garantie PENDING a une raison explicite après F5',()=>assert.match(page,/La décision Garantie est en attente/));
test('OR25-FE-10 Garantie APPROVED est reconstruite via le contrat serveur',()=>assert.match(page,/approvalActive=ro\.customerApproval\.canDecide/));
test('OR25-FE-11 décision submit vient explicitement du bouton',()=>assert.match(page,/submitter\?\.getAttribute\('value'\)==='approved'/));
test('OR25-FE-12 mutation invalide la query détail',()=>assert.match(hooks,/invalidateQueries\(\{queryKey:\['repair-orders',v\.repairOrderId\]\}\)/));
test('OR25-FE-13 contrat est typé et mappé',()=>{assert.match(types,/customerApproval:\{required:boolean;decided:boolean;decision:/);assert.match(hooks,/customerApproval:\{required:Boolean/)});
test('OR25-FE-14 booléen SQL 0 est reconstruit comme refus',()=>assert.match(hooks,/approved:Number\(x\.approved\)===1/));
test('OR25-FE-15 aucune persistance navigateur métier dans l’écran',()=>assert.doesNotMatch(page,/localStorage|sessionStorage|indexedDB/i));
