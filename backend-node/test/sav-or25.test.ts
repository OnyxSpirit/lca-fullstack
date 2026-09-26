import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const routes=readFileSync(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');
const detail=routes.slice(routes.indexOf('async function detail'),routes.indexOf('async function notify'));
const approval=routes.slice(routes.indexOf('"/repair-orders/:id/approval"'),routes.indexOf('"/service-appointments"'));
const status=routes.slice(routes.indexOf('"/repair-orders/:id/status"'),routes.indexOf('"/repair-orders/:id/inspection"'));

test('OR25-01 GET détail expose un contrat de décision reconstructible',()=>{assert.match(detail,/customerApproval=\{required:/);assert.match(detail,/approvals,/);assert.match(detail,/estimateSummary/)});
test('OR25-02 waiting_approval sans décision reste décidable',()=>assert.match(detail,/canDecide:ro\.status==='waiting_approval'&&!latestApproval/));
test('OR25-03 acceptation et refus sont restitués depuis repair_approvals',()=>{assert.match(detail,/decision:latestApproval/);assert.match(detail,/APPROVED.*REJECTED/)});
test('OR25-04 montant soumis vient du devis serveur ou de la décision persistée',()=>assert.match(detail,/submittedAmount:latestApproval\?\.approved_amount==null\?estimateSummary\.total:Number/));
test('OR25-05 aucune décision interdit toujours le démarrage',()=>assert.match(status,/if \(!a\?\.approved\)[\s\S]*Validation client obligatoire/));
test('OR25-06 refus interdit toujours tous les démarrages protégés',()=>assert.match(routes,/assertCustomerDidNotReject/));
test('OR25-07 états multi-OR sont filtrés par identifiant',()=>assert.match(detail,/repair_approvals a[\s\S]*a\.repair_order_id=\?/));
test('OR25-08 Garantie PENDING interdit explicitement la décision',()=>assert.match(detail,/warranty as any\)\?\.decision_status!=='PENDING'/));
test('OR25-09 décision est persistante et indépendante du frontend',()=>assert.match(approval,/INSERT INTO repair_approvals/));
test('OR25-10 double soumission est protégée sous verrou',()=>{assert.match(approval,/repair_approvals WHERE repair_order_id=\? LIMIT 1 FOR UPDATE/);assert.match(approval,/La décision client a déjà été enregistrée/)});
test('OR25-11 décisions concurrentes verrouillent d’abord le même OR',()=>assert.match(approval,/repair_orders WHERE id=\? FOR UPDATE/));
test('OR25-12 GET restitue auteur date signature et notes existants',()=>assert.match(detail,/SELECT a\.\*,CONCAT_WS[\s\S]*recorded_by_name/));
