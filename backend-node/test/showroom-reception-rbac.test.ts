import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../src/modules/showroom/showroom.routes.ts',import.meta.url),'utf8');

test('SHOWROOM-01 les routes utilisent les permissions agence exactes',()=>{
  for(const code of ['showroom.view','showroom.visitor.create','showroom.assign','showroom.status.update','showroom.visitor.update'])assert.match(source,new RegExp(`requireAgencyBusinessPermission\\('${code.replaceAll('.','\\.')}\\'\\)`));
});
test('SHOWROOM-02 aucun rôle ni scope historique ne pilote le runtime',()=>{
  assert.doesNotMatch(source,/RECEPTIONIST|COMMERCIAL|SALES_MANAGER|DIRECTION|roles\.includes|hasRole\(|authorize\(/);
  assert.doesNotMatch(source,/grant==='GLOBAL'|grant==='CONCESSION'|level==='GLOBAL'|level==='CONCESSION'/);
});
test('SHOWROOM-03 OWN suit le conseiller ou le réceptionnaire avant affectation',()=>{
  assert.match(source,/assigned_user_id IS NULL AND \$\{alias\}\.greeted_by=\?/);
  assert.match(source,/\$\{alias\}\.agency_id=\? AND/);
  assert.match(source,/assertLockedVisitScope/);
});
test('SHOWROOM-04 une agence client ne peut pas changer l’agence active',()=>{
  assert.match(source,/agencyId\(request,body\.agencyId,'showroom\.visitor\.create'\)/);
  assert.match(source,/target!==agency/);
});
test('SHOWROOM-05 le conseiller est habilité localement et opérationnel',()=>{
  for(const token of ['JOIN user_agencies ua','JOIN user_agency_roles uar',"ua.status='ACTIVE'",'u.is_active=TRUE','r.is_active=TRUE','r.is_system=FALSE','p.is_active=TRUE',"p.code IN ('sales.create','crm.prospect.update')","operationalCandidateSql('u')"])assert.ok(source.includes(token),token);
});
test('SHOWROOM-06 les mutations verrouillent et contrôlent la version lue',()=>{
  assert.match(source,/SELECT agency_id,assigned_user_id,greeted_by,status FROM showroom_visits WHERE id=\? FOR UPDATE/);
  assert.match(source,/currentAssignee!==expected/);
  assert.match(source,/withCurrentAgencyBusinessAuthorization/);
});
test('SHOWROOM-07 affectation idempotente et annulation avec permission exacte',()=>{
  assert.match(source,/currentAssignee===assignee\)return false/);
  assert.match(source,/if\(changed\)await notify/);
  assert.match(source,/patch\('\/showroom\/:id\/cancel',requireAgencyBusinessPermission\('showroom\.status\.update'\)/);
});
test('SHOWROOM-08 création et affectation persistent les statuts canoniques',()=>{
  assert.match(source,/queue_number,status\).*'waiting'/);
  assert.match(source,/status='assigned'/);
});
