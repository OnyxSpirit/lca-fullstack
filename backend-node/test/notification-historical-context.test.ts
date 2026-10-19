import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const migration=source('database/migrations/094_notification_historical_context.sql');
const service=source('src/modules/notifications/notification.service.ts');
const routes=source('src/modules/notifications/notification.routes.ts');

test('B348-01 la migration est additive et ne réécrit pas l’historique',()=>{
  for(const field of ['actor_type','actor_user_id','actor_display_name_snapshot','operation_agency_id','operation_agency_name_snapshot'])assert.match(migration,new RegExp(field));
  assert.match(migration,/DEFAULT 'UNKNOWN'/);
  assert.doesNotMatch(migration,/^\s*(?:UPDATE|DELETE|TRUNCATE)\b/im);
});

test('B348-02 le service résout les snapshots avant insertion et émet seulement un hint privé',()=>{
  assert.match(service,/TRIM\(CONCAT\(first_name,' ',last_name\)\) display_name/);
  assert.match(service,/SELECT id,name FROM agencies WHERE id=\?/);
  assert.match(service,/actor_display_name_snapshot,operation_agency_id,operation_agency_name_snapshot/);
  assert.match(service,/emitToUser\(input\.userId,'notifications:created',\{id:record\.id\}\)/);
});

test('B348-03 les snapshots sont exposés sans participer à la visibilité RBAC',()=>{
  assert.match(routes,/actor_display_name_snapshot/);
  assert.match(routes,/operation_agency_name_snapshot/);
  assert.match(routes,/requested==='mine'.*recipient\.id=\?/);
  assert.doesNotMatch(routes,/actor_user_id=\?|operation_agency_id=\?/);
});

test('B348-04 les producteurs métier transmettent un auteur explicite',()=>{
  for(const file of ['crm/crm.notifications.ts','vehicles/vehicle.routes.ts','sales/sale.service.ts','quotations/quotation.service.ts','billing/billing.routes.ts','deliveries/delivery.routes.ts','workshop/workshop.routes.ts','showroom/showroom.routes.ts','hr/hr.routes.ts','hr/hr-bonus.routes.ts']){
    assert.match(source(`src/modules/${file}`),/actorType:'human'/,file);
  }
});
