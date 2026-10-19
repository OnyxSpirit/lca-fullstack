import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const section=readFileSync(new URL('../src/modules/hr/ProviderContractsSection.tsx',import.meta.url),'utf8');

test('LOT4.1 affiche Modifier uniquement pour un brouillon administrable',()=>{assert.match(section,/canManage&&c\.status==='DRAFT'/);assert.match(section,/>Modifier</);assert.doesNotMatch(section,/c\.status==='ACTIVE'.{0,300}>Modifier</s)});
test('LOT4.1 charge et préremplit tous les champs modifiables',()=>{assert.match(section,/apiRequest<Detail>\(`\/hr\/provider-contracts\/\$\{c\.id\}`\)/);for(const field of['service_subject','description','start_date','contractual_end_date','compensation_mode','periodicity','contractual_amount','payment_terms','special_conditions','installments','requirements'])assert.match(section,new RegExp(`d\\.${field}`))});
test('LOT4.1 réutilise PATCH, conserve le formulaire sur erreur et actualise sur succès',()=>{assert.match(section,/method:'PATCH'/);assert.match(section,/editingId\?update\.mutateAsync/);assert.match(section,/if\(ok\)\{setCreateOpen\(false\)/);assert.match(section,/catch\(error\).*return false/s)});
test('LOT4.1 conserve création, modalités, échéancier et GED',()=>{assert.match(section,/method:'POST'/);assert.match(section,/PERIODIC/);assert.match(section,/FIXED/);assert.match(section,/INSTALLMENTS/);assert.match(section,/useEntityDocuments\('provider_contract'/);assert.match(section,/Enregistrer les modifications/)});
test('LOT4.1 verrouille agence et référence pendant une modification',()=>{assert.equal((section.match(/disabled=\{Boolean\(editingId\)\}/g)??[]).length,2);assert.match(section,/Seul un contrat brouillon peut être modifié/)});
