import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const page=read('src/modules/treasury/TreasuryPage.tsx');
const hooks=read('src/api/treasuryHooks.ts');

test('CAT-UX-01 création et modification utilisent des modales intégrées',()=>{
 assert.match(page,/Nouvelle catégorie de trésorerie/);
 assert.match(page,/Modifier la catégorie/);
 assert.match(page,/openCategoryCreate/);
 assert.match(page,/openCategoryEdit/);
 assert.doesNotMatch(page,/prompt\('Code de catégorie'|prompt\('Nom de catégorie'|prompt\('Sens : IN/);
});

test('CAT-UX-02 formulaire couvre le contrat et les trois sens',()=>{
 for(const token of['code','name','description','allowedDirection'])assert.ok(page.includes(token),token);
 for(const direction of['IN','OUT','BOTH'])assert.match(page,new RegExp(`<option value="${direction}">`));
 assert.match(page,/maxLength=\{50\}/);
 assert.match(page,/maxLength=\{150\}/);
 assert.match(page,/maxLength=\{1000\}/);
 assert.match(page,/\^\[A-Z0-9\]\[A-Z0-9_-\]\*\$/);
});

test('CAT-UX-03 modification conserve le code et utilise PATCH',()=>{
 assert.match(page,/disabled=\{categoryModal\?\.mode==='edit'\}/);
 assert.match(hooks,/updateCategory:useMutation/);
 assert.match(hooks,/`\/treasury\/categories\/\$\{id\}`/);
 assert.match(hooks,/method:'PATCH'/);
});

test('CAT-UX-04 erreurs, chargements, succès et rafraîchissement sont gérés',()=>{
 assert.match(page,/role="alert"/);
 assert.match(page,/createCategory\.isPending\|\|actions\.updateCategory\.isPending/);
 assert.match(page,/categoryStatus\.isPending/);
 assert.match(page,/Catégorie créée/);
 assert.match(page,/Catégorie modifiée/);
 assert.match(page,/Catégorie désactivée/);
 assert.match(hooks,/onSuccess:refresh/);
 assert.match(hooks,/invalidateQueries\(\{queryKey:keys\.all\}\)/);
});

test('CAT-UX-05 actions exigent permission et scope collectif',()=>{
 assert.match(page,/can\('treasury\.category\.manage'\)/);
 assert.match(page,/categoryScope==='CONCESSION'\|\|categoryScope==='GLOBAL'/);
 assert.match(page,/canManageCategories&&<Button/);
});

test('CAT-UX-06 statut est confirmé sans suppression et préserve l’historique',()=>{
 assert.match(page,/Désactiver la catégorie/);
 assert.match(page,/Les écritures et l’historique existants seront intégralement conservés/);
 assert.match(page,/usage_count/);
 assert.doesNotMatch(page,/DELETE|Supprimer la catégorie/);
 assert.match(hooks,/\/treasury\/categories\/\$\{id\}\/status/);
});

test('CAT-UX-07 liste vide et changement de sens utilisé sont explicites',()=>{
 assert.match(page,/Aucune catégorie\. Créez la première catégorie/);
 assert.match(page,/Le nouveau sens s’appliquera uniquement aux futures opérations/);
 assert.match(page,/category\.usage_count>0/);
});
