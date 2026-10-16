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

test('NAV-2FA-02 la sidebar rattache le centre au groupe Utilisateurs & RBAC',()=>{
  const sidebar=source('src/components/layout/Sidebar.tsx');
  assert.match(sidebar,/label: 'Utilisateurs & RBAC'[\s\S]*children:/);
  assert.match(sidebar,/label:'Collaborateurs'/);
  assert.match(sidebar,/label:'Matrice RBAC'/);
  assert.match(sidebar,/label:'Centre de sécurité 2FA'/);
  assert.match(sidebar,/canAccessSecurityCenter\(currentUser\.permissions\)/);
  assert.match(sidebar,/location\.pathname==='\/security\/2fa'/);
  assert.match(sidebar,/aria-expanded=\{usersGroupOpen\}/);
});

test('NAV-2FA-03 les onglets utilisateurs sont adressables et le centre expose son breadcrumb',()=>{
  const users=source('src/modules/users/UsersManagementPage.tsx');
  const center=source('src/modules/auth/TwoFactorSecurityCenterPage.tsx');
  assert.match(users,/useSearchParams/);
  assert.match(users,/requestedTab==='matrix'/);
  assert.match(center,/breadcrumbs=\{\[\{label:'Utilisateurs & RBAC'\},\{label:'Centre de sécurité 2FA'\}\]\}/);
});
