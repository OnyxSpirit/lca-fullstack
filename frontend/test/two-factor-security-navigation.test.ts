import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canAccessSecurityCenter, SECURITY_CENTER_PERMISSIONS } from '../src/navigation/permissions';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('NAV-2FA-01 le centre est visible avec chacune des permissions effectives prévues',()=>{
  for(const permission of SECURITY_CENTER_PERMISSIONS){
    assert.equal(canAccessSecurityCenter({[permission]:'AGENCY'}),true,permission);
  }
  assert.equal(canAccessSecurityCenter({'users.view':'GLOBAL'}),false);
  assert.equal(canAccessSecurityCenter(undefined),false);
});

test('NAV-2FA-02 la sidebar conserve un bouton unique Utilisateurs & RBAC',()=>{
  const sidebar=source('src/components/layout/Sidebar.tsx');
  assert.equal((sidebar.match(/label: 'Utilisateurs & RBAC'/g)??[]).length,1);
  assert.doesNotMatch(sidebar,/children:/);
  assert.doesNotMatch(sidebar,/aria-expanded/);
  assert.match(sidebar,/canAccessSecurityCenter\(currentUser\.permissions\)/);
  assert.match(sidebar,/location\.pathname==='\/security\/2fa'/);
});

test('NAV-2FA-03 les trois sections restent internes à la page historique',()=>{
  const users=source('src/modules/users/UsersManagementPage.tsx');
  const app=source('src/App.tsx');
  assert.match(users,/useSearchParams/);
  assert.match(users,/requestedTab==='matrix'/);
  assert.match(users,/>Collaborateurs<\/button>/);
  assert.match(users,/>Matrice RBAC<\/button>/);
  assert.match(users,/>Centre de sécurité 2FA<\/button>/);
  assert.match(users,/<TwoFactorSecurityCenterPage embedded\/>/);
  assert.match(app,/path="security\/2fa"[\s\S]*<UsersManagementPage/);
  assert.match(app,/can\('users\.view'\)\|\|can\('roles\.view'\)\|\|SECURITY_CENTER_PERMISSIONS\.some\(can\)/);
  assert.match(users,/useUsersAdminQuery\([\s\S]*canViewUsers\)/);
  assert.match(users,/useAgenciesQuery\(canViewUsers\)/);
});
