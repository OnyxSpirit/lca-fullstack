import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/modules/customers/customer.routes.ts',import.meta.url),'utf8');
const route=source.slice(source.indexOf("customerRouter.get('/customers/:id/360'"));

test('RBAC-01 la timeline applique le scope Livraison à son alias autoritatif',()=>{
  assert.match(route,/permissionScopePredicate\(request,'delivery\.view',\{agency:'d\.agency_id',owner:'d\.delivery_specialist_id'\}\)/);
  assert.match(route,/d\.customer_id=\? AND \$\{deliveryTimelineScope\.sql\}/);
  assert.match(route,/timelineParams\.push\(id,\.\.\.deliveryTimelineScope\.params\)/);
});

test('RBAC-01 la timeline Showroom conserve la règle OWN du module',()=>{
  assert.match(source,/sv\.agency_id=\? AND \(sv\.assigned_user_id=\? OR \(sv\.assigned_user_id IS NULL AND sv\.greeted_by=\?\)\)/);
  assert.match(route,/sv\.customer_id=\? AND \$\{showroomScope\.sql\}/);
  assert.match(route,/timelineParams\.push\(id,\.\.\.showroomScope\.params\)/);
});

test('RBAC-01 la timeline GED intersecte scope GED et scope métier documentaire',()=>{
  assert.match(source,/documentAccessPredicate\(request,'ged\.view'\)/);
  assert.match(route,/d\.entity_type='customer'.*\$\{documentScope\.clause\}/);
  assert.match(route,/timelineParams\.push\(id,\.\.\.documentScope\.params\)/);
});
