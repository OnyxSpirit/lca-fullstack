import assert from 'node:assert/strict';
import {readContractFileSync as readFileSync} from './helpers/source-contract.js';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('AUD-LCA-001 refuse explicitement plusieurs rôles actifs',()=>{
  const rbac=source('src/modules/rbac/rbac.service.ts');
  assert.match(rbac,/ORDER BY r\.is_system DESC,r\.code,r\.id/);
  assert.match(rbac,/roles\.length>1.*MULTIPLE_ACTIVE_ROLES/);
  assert.doesNotMatch(rbac,/LIMIT 1/);
});

test('AUD-LCA-002 ne réduit plus les scopes dynamiques à l agence du jeton',()=>{
  const middleware=source('src/middleware/agency-scope.ts');
  assert.doesNotMatch(middleware,/requested.*request\.user\?\.agencyId/);
  assert.doesNotMatch(middleware,/autre agence/);
});

test('AUD-LCA-003 invalide les sockets lors des mutations RBAC et mots de passe',()=>{
  const socket=source('src/realtime/socket.ts'),users=source('src/modules/users/user.service.ts');
  assert.match(socket,/event==='rbac:updated'.*disconnectUser/);
  assert.match(socket,/active\.agency_id==null\?null:String/);
  assert.match(users,/changeOwnPassword[\s\S]*disconnectUser\(req\.user!\.sub\)/);
  assert.match(users,/resetPassword[\s\S]*disconnectUser\(id\)/);
});

test('AUD-LCA-004 réduit le DTO annuaire',()=>{
  const users=source('src/modules/users/user.service.ts');
  const directory=users.slice(users.indexOf('export async function directory'),users.indexOf('export async function create'));
  assert.doesNotMatch(directory,/permission_codes|isSystemSuperAdmin|permissions:/);
});

test('AUD-LCA-005 protège la transition CRM par compare-and-swap',()=>{
  const crm=source('src/modules/crm/crm.routes.ts');
  const route=crm.slice(crm.indexOf("crmRouter.patch('/leads/:id/stage'"),crm.indexOf("crmRouter.post('/leads/:id/appointments'"));
  assert.match(route,/WHERE lead_id=\? AND stage=\?/);
  assert.match(route,/!result\.affectedRows.*409/);
});

test('AUD-LCA-008 préserve les invariants de contact et identité au PATCH',()=>{
  const crm=source('src/modules/crm/crm.routes.ts');
  const route=crm.slice(crm.indexOf("crmRouter.patch('/leads/:id'"),crm.indexOf("crmRouter.patch('/leads/:id/stage'"));
  assert.match(route,/current\.lead_type==='company'.*raison sociale/);
  assert.match(route,/!finalPhone&&!finalEmail.*téléphone ou un e-mail/);
});

test('AUD-LCA-009 poursuit la recherche GED au-delà du premier lot global',()=>{
  const access=source('src/modules/documents/document-access.ts');
  assert.match(access,/for\(let offset=0;out\.length<15;offset\+=50\)/);
  assert.match(access,/LIMIT 50 OFFSET \?/);
});

test('AUD-LCA-010 rend les mutations GED et leur audit atomiques',()=>{
  const documents=source('src/modules/documents/document.routes.ts');
  for(const action of ['archive','restore'])assert.match(documents,new RegExp(`action:\\s*['\"]${action}['\"]`));
  assert.match(documents,/action:\s*['\"]version['\"]/);
  assert.match(documents,/version[\s\S]*transaction\(async connection/);
});

test('AUD-LCA-011 à 019 appliquent les protections proportionnées',()=>{
  assert.match(source('src/modules/reports/financial-report.service.ts'),/COALESCE\(b\.concession_id,ba\.concession_id\)=\(SELECT concession_id/);
  assert.match(source('src/modules/documents/document-access.ts'),/invoice:\['billing\.invoice\.view'\]/);
  assert.match(source('src/config/database.ts'),/queueLimit: env\.db\.queueLimit/);
  assert.match(source('src/modules/users/user-avatar.ts'),/signatureMatches/);
  assert.doesNotMatch(source('src/app.ts'),/\/api\/health'[\s\S]{0,100}SELECT 1/);
});

test('AUD-LCA-021 prépare le profil puis crée session et last_login atomiquement',()=>{
  const auth=source('src/modules/auth/auth.service.ts');
  assert.ok(auth.indexOf('const profile=await userProfile(user)')<auth.indexOf('const tokens = await issueTokens(user, roles)'));
  assert.match(auth,/transaction\(async connection.*INSERT INTO refresh_tokens.*UPDATE users SET last_login_at/s);
});
