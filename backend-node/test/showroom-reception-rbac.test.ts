import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source=readFileSync(new URL('../src/modules/showroom/showroom.routes.ts',import.meta.url),'utf8');

test('SHOWROOM-01 les routes utilisent les permissions Showroom exactes',()=>{
  for(const code of ['showroom.view','showroom.visitor.create','showroom.assign','showroom.status.update','showroom.visitor.update'])assert.match(source,new RegExp(`requirePermission\\('${code.replaceAll('.','\\.')}\\'\\)`));
});

test('SHOWROOM-02 aucun nom de rôle ne pilote le runtime Showroom',()=>{
  assert.doesNotMatch(source,/RECEPTIONIST|COMMERCIAL|SALES_MANAGER|DIRECTION|roles\.includes|hasRole\(|authorize\(/);
});

test('SHOWROOM-03 OWN visite suit le conseiller affecté ou, avant affectation, le réceptionnaire',()=>{assert.match(source,/assigned_user_id IS NULL AND \$\{alias\}\.greeted_by=\?/);assert.match(source,/\$\{alias\}\.agency_id=\? AND/)});
test('SHOWROOM-04 CONCESSION est résolu depuis agencies',()=>assert.match(source,/scoped_agency\.concession_id=.*actor_agency\.concession_id/));
test('SHOWROOM-05 une agence fournie par le client est validée selon le scope',()=>{assert.match(source,/agencyId\(request,body\.agencyId,'showroom\.visitor\.create'\)/);assert.match(source,/Agence hors du scope Showroom/)});
test('SHOWROOM-06 le conseiller doit être actif, de la bonne agence et habilité',()=>{for(const token of ['u.agency_id=?','u.is_active=TRUE','r.is_active=TRUE',"p.code IN ('sales.create','crm.prospect.update')"])assert.ok(source.includes(token),token)});
test('SHOWROOM-07 l’affectation verrouille la visite et contrôle la version lue',()=>{assert.match(source,/SELECT assigned_user_id,status FROM showroom_visits WHERE id=\? FOR UPDATE/);assert.match(source,/currentAssignee!==expected/)});
test('SHOWROOM-08 une affectation identique est idempotente et ne renotifie pas',()=>{assert.match(source,/currentAssignee===assignee\)return false/);assert.match(source,/if\(changed\)await notify/)});
test('SHOWROOM-09 l’annulation exige showroom.status.update',()=>assert.match(source,/patch\('\/showroom\/:id\/cancel',requirePermission\('showroom\.status\.update'\)/));
test('SHOWROOM-10 création et affectation persistent les statuts canoniques',()=>{assert.match(source,/queue_number,status\).*'waiting'/);assert.match(source,/status='assigned'/)});
