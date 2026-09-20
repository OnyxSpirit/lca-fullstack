import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDelegablePermissions, can, type RbacContext } from '../src/modules/rbac/rbac.service.js';
import { HttpError } from '../src/shared/http-error.js';

const context=(permissions:Record<string,'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL'|null>,overrides:Partial<RbacContext>={}):RbacContext=>({
  roleId:'99',roleCode:'COMMERCIAL_JUNIOR',isSuperAdmin:false,permissions:new Map(Object.entries(permissions)),...overrides,
});

test('un rôle dynamique inconnu est autorisé uniquement par ses permissions',()=>{
  const actor=context({'crm.prospect.view':'AGENCY'});
  assert.equal(can(actor,'crm.prospect.view'),true);
  assert.equal(can(actor,'billing.payment.refund'),false);
});

test('la délégation respecte OWN < AGENCY < CONCESSION < GLOBAL',()=>{
  const actor=context({'crm.prospect.view':'AGENCY'});
  assert.doesNotThrow(()=>assertDelegablePermissions(actor,[{code:'crm.prospect.view',scope:'OWN'}]));
  assert.doesNotThrow(()=>assertDelegablePermissions(actor,[{code:'crm.prospect.view',scope:'AGENCY'}]));
  for(const scope of ['CONCESSION','GLOBAL'] as const)assert.throws(()=>assertDelegablePermissions(actor,[{code:'crm.prospect.view',scope}]),(error:unknown)=>error instanceof HttpError&&error.status===403);
});

test('une permission absente ne peut pas être déléguée',()=>{
  assert.throws(()=>assertDelegablePermissions(context({}),[{code:'billing.payment.refund',scope:'OWN'}]),(error:unknown)=>error instanceof HttpError&&error.status===403);
});

test('SUPER_ADMIN système conserve le bypass global, DIRECTOR non',()=>{
  const superAdmin=context({}, {roleCode:'SUPER_ADMIN',isSuperAdmin:true});
  const director=context({}, {roleCode:'DIRECTOR'});
  assert.doesNotThrow(()=>assertDelegablePermissions(superAdmin,[{code:'billing.payment.refund',scope:'GLOBAL'}]));
  assert.equal(can(superAdmin,'permission.inconnue'),true);
  assert.equal(can(director,'permission.inconnue'),false);
});

test('une permission sans scope ne permet pas de déléguer un scope de données',()=>{
  const actor=context({'roles.permissions.manage':null});
  assert.doesNotThrow(()=>assertDelegablePermissions(actor,[{code:'roles.permissions.manage',scope:null}]));
  assert.throws(()=>assertDelegablePermissions(actor,[{code:'roles.permissions.manage',scope:'OWN'}]),(error:unknown)=>error instanceof HttpError&&error.status===403);
});
