import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const page=read('src/modules/treasury/TreasuryPage.tsx');
const hooks=read('src/api/treasuryHooks.ts');

test('ACC-UX-01 création et modification utilisent des modales sans prompt compte',()=>{
 assert.match(page,/Nouveau compte de trésorerie/);
 assert.match(page,/Modifier le compte/);
 assert.match(page,/openAccountCreate/);
 assert.match(page,/openAccountEdit/);
 assert.doesNotMatch(page,/prompt\('Code du compte'|prompt\('Nom du compte'|prompt\('Type : CASH/);
});

test('ACC-UX-02 formulaire respecte les champs et validations backend',()=>{
 for(const token of['accountForm.code','accountForm.name','accountForm.description','accountForm.accountType'])assert.ok(page.includes(token),token);
 assert.match(page,/maxLength=\{50\}/);
 assert.match(page,/maxLength=\{150\}/);
 assert.match(page,/maxLength=\{1000\}/);
 assert.match(page,/\^\[A-Z0-9\]\[A-Z0-9_-\]\*\$/);
 for(const type of['CASH','BANK','OTHER'])assert.match(page,new RegExp(`<option value="${type}">`));
});

test('ACC-UX-03 création délègue devise et périmètre sans solde ouverture',()=>{
 const creation=page.slice(page.indexOf('const submitAccount='),page.indexOf('const openCategoryCreate='));
 assert.doesNotMatch(creation,/currencyCode|agencyId|concessionId|openingBalance|openingDate|openingJustification/);
 assert.doesNotMatch(page,/currencyCode:'XAF'/);
 assert.match(page,/La devise et le périmètre seront déterminés par le serveur/);
 assert.match(page,/Aucun solde d’ouverture ne sera créé/);
});

test('ACC-UX-04 modification conserve les champs immuables et utilise PATCH',()=>{
 assert.match(page,/disabled=\{accountModal\?\.mode==='edit'\}/);
 assert.match(page,/Le code, la devise et le périmètre ne sont pas modifiables/);
 assert.match(hooks,/updateAccount:useMutation/);
 assert.match(hooks,/`\/treasury\/accounts\/\$\{id\}`/);
 assert.match(hooks,/method:'PATCH'/);
});

test('ACC-UX-05 permission et scopes autorisent AGENCY CONCESSION GLOBAL mais refusent OWN',()=>{
 assert.match(page,/can\('treasury\.account\.manage'\)/);
 assert.match(page,/manageScope!==null&&manageScope!=='OWN'/);
 assert.match(page,/canManageAccounts&&<Button/);
});

test('ACC-UX-06 statut est confirmé avec contexte et historique préservé',()=>{
 assert.match(page,/Désactiver le compte/);
 assert.match(page,/Solde indicatif/);
 assert.match(page,/Il restera visible dans les historiques et ses écritures seront conservées/);
 assert.match(hooks,/\/treasury\/accounts\/\$\{id\}\/status/);
 assert.doesNotMatch(page,/Supprimer le compte/);
});

test('ACC-UX-07 erreurs restent inline, pending bloque et succès invalide puis notifie',()=>{
 assert.match(page,/setAccountFormError\(error instanceof Error\?error\.message/);
 assert.match(page,/role="alert"/);
 assert.match(page,/createAccount\.isPending\|\|actions\.updateAccount\.isPending/);
 assert.match(page,/accountStatus\.isPending/);
 assert.match(page,/Compte créé/);
 assert.match(page,/Compte modifié/);
 assert.match(page,/Compte désactivé/);
 assert.match(hooks,/invalidateQueries\(\{queryKey:keys\.all\}\)/);
});

test('ACC-UX-08 annulation ferme sans mutation et Phase A reste présente',()=>{
 assert.match(page,/const closeAccountModal=/);
 assert.match(page,/type="button" variant="outline"[^>]+onClick=\{closeAccountModal\}>Annuler/);
 assert.match(page,/Nouvelle catégorie de trésorerie/);
 assert.match(page,/Modifier la catégorie/);
 assert.match(hooks,/updateCategory:useMutation/);
});
