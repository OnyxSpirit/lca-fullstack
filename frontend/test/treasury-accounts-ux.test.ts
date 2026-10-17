import assert from'node:assert/strict';
import{readContractFileSync as readFileSync}from'./helpers/source-contract';
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

test('ACC-UX-03 création délègue la devise mais transmet un rattachement explicite sans solde ouverture',()=>{
 const creation=page.slice(page.indexOf('const submitAccount'),page.indexOf('const openCategoryCreate'));
 assert.doesNotMatch(creation,/currencyCode|openingBalance|openingDate|openingJustification/);
 for(const field of['attachmentType','concessionId','agencyId'])assert.match(creation,new RegExp(field));
 assert.doesNotMatch(page,/currencyCode:'XAF'/);
 assert.match(page,/Le serveur vérifiera que le rattachement sélectionné appartient à votre périmètre/);
 assert.match(page,/Aucun solde d’ouverture ne sera créé/);
});

test('ACC-UX-04 modification conserve code/devise, verrouille le rattachement utilisé et utilise PATCH',()=>{
 assert.match(page,/disabled=\{accountModal\?\.mode==='edit'\}/);
 assert.match(page,/accountModal\?\.mode==='edit'&&!Boolean\(accountModal\.account\?\.attachment_mutable\)/);
 assert.match(page,/Le rattachement est verrouillé car ce compte possède un historique ou un engagement financier/);
 assert.match(hooks,/updateAccount:useMutation/);
 assert.match(hooks,/`\/treasury\/accounts\/\$\{id\}`/);
 assert.match(hooks,/method:'PATCH'/);
});

test('ACC-UX-05 permission et scopes autorisent AGENCY CONCESSION GLOBAL mais refusent OWN',()=>{
 assert.match(page,/can\('treasury\.account\.manage'\)/);
 assert.match(page,/manageScope!==null&&manageScope!=='OWN'/);
 assert.match(page,/canManageAccounts&&\(/);
});

test('ACC-UX-06 statut est confirmé avec contexte et historique préservé',()=>{
 assert.match(page,/Désactiver le compte/);
 assert.match(page,/Solde indicatif/);
 assert.match(page,/Il restera visible dans les historiques et ses écritures seront conservées/);
 assert.match(hooks,/\/treasury\/accounts\/\$\{id\}\/status/);
 assert.doesNotMatch(page,/Supprimer le compte/);
});

test('ACC-UX-07 erreurs restent inline, pending bloque et succès invalide puis notifie',()=>{
 assert.match(page,/setAccountFormError\(/);
 assert.match(page,/error instanceof Error/);
 assert.match(page,/error\.message/);
 assert.match(page,/role="alert"/);
 assert.match(page,/createAccount\.isPending\|\|actions\.updateAccount\.isPending/);
 assert.match(page,/accountStatus\.isPending/);
 assert.match(page,/Compte créé/);
 assert.match(page,/Compte modifié/);
 assert.match(page,/Compte désactivé/);
 assert.match(hooks,/invalidateQueries\(\{queryKey:keys\.all\}\)/);
});

test('ACC-UX-08 annulation ferme sans mutation et Phase A reste présente',()=>{
 assert.match(page,/const closeAccountModal\s*=/);
 assert.match(page,/type="button"[\s\S]*?variant="outline"[\s\S]*?onClick=\{closeAccountModal\}[\s\S]*?>[\s\S]*?Annuler/);
 assert.match(page,/Nouvelle catégorie de trésorerie/);
 assert.match(page,/Modifier la catégorie/);
 assert.match(hooks,/updateCategory:useMutation/);
});
