import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),routes=source('src/modules/users/user.routes.ts'),assignments=source('src/modules/users/user-agency.service.ts'),settings=source('src/modules/settings/setting.routes.ts'),settingService=source('src/modules/settings/setting.service.ts'),authorization=source('src/modules/rbac/agency-authorization.ts');

test('PH2C2B-ADMIN sépare référentiels centraux et habilitations locales',()=>{
 for(const permission of ['roles.create','roles.update','roles.disable','roles.delete'])assert.match(routes,new RegExp(`requireCentralAgencyPermission\\('${permission.replace('.','\\.')}'\\)`));
 for(const permission of ['users.assign_agency','users.assign_role'])assert.match(routes,new RegExp(`requireAgencyBusinessPermission\\('${permission.replace('.','\\.')}'\\)`));
 assert.match(settings,/post\('\/agencies',validateAgencyCreation,requireCentralAgencyPermission\('settings\.agencies\.manage'\)/);
 assert.match(settings,/patch\('\/agencies\/:id\/status',requireCentralAgencyPermission\('settings\.agencies\.manage'\)/);
 assert.match(authorization,/context\.isSuperAdmin&&context\.permissions\.has\(permission\)/);
});

test('PH2C2B-ADMIN lie les habilitations à agence active et refuse élévation',()=>{
 assert.match(assignments,/ua\.agency_id=\?/);
 assert.match(assignments,/String\(current\.agency_id\)!==context\.activeAgencyId/);
 assert.match(assignments,/if\(role\.is_system\)throw new HttpError\(403/);
 assert.match(assignments,/Rôle non délégable dans l’agence active/);
 assert.match(assignments,/target in rank/);
 assert.match(routes,/withCurrentAgencyAuthorization/);
 assert.doesNotMatch(assignments,/assertPermission\(request,'users\.assign_role'/);
});

test('PH2C2B-ADMIN synchronise sessions et sockets après habilitation',()=>{
 assert.match(routes,/disconnectUser\(id\);res\.(?:json|status)/);
 assert.match(assignments,/agency_context_version=agency_context_version\+1/);
 assert.match(settingService,/active_agency_id=NULL,agency_context_version=agency_context_version\+1/);
 assert.match(settingService,/refreshRealtimeSession\(sessionId\)/);
});
