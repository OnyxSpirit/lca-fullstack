import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('RBAC dynamique : profil, permissions et actualisation temps réel sont câblés',()=>{
  const auth=source('src/modules/auth/auth.service.ts');
  const users=source('src/modules/users/user.service.ts');
  const realtime=source('src/realtime/socket.ts');
  assert.match(auth,/resolveRbacContext/);
  assert.match(auth,/permissions:/);
  assert.match(users,/INVALID_OR_INACTIVE_ROLE/);
  assert.match(users,/rbac:updated/);
  assert.match(realtime,/emitToUser/);
});

test('CRM et ventes utilisent les permissions et scopes, pas une liste de rôles',()=>{
  const crm=source('src/modules/crm/crm.routes.ts');
  const sales=source('src/modules/sales/sale.routes.ts');
  const saleService=source('src/modules/sales/sale.service.ts');
  assert.match(crm,/requirePermission\('crm\.prospect\.view'\)/);
  assert.match(crm,/permissionScope==='OWN'/);
  assert.match(crm,/permissionScope==='CONCESSION'/);
  assert.match(sales,/requirePermission\('sales\.view'\)/);
  assert.match(saleService,/value==='OWN'/);
  assert.match(saleService,/value==='CONCESSION'/);
});
