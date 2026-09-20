# Run only against the disposable MySQL/Docker validation stack documented in docs/FRESH_RBAC_VALIDATION.md.
import json, urllib.request, urllib.error
base='http://127.0.0.1:13082/api'
def call(path, token=None, body=None, method=None, status=200):
 req=urllib.request.Request(base+path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})}, method=method or ('POST' if body is not None else 'GET'))
 try:
  with urllib.request.urlopen(req) as r: code=r.status; data=r.read()
 except urllib.error.HTTPError as e: code=e.code; data=e.read()
 assert code==status,(path,code,data.decode())
 return json.loads(data) if data else None
admin=call('/auth/login',body={'email':'admin@rbac.test','password':'disposable-admin-password'})
a=admin['accessToken']; agency=admin['user']['agencyId']
roles=call('/roles',a); assert len(roles)==1 and roles[0]['code']=='SUPER_ADMIN'
perms=call('/permissions',a); assert len(perms)==142
assign=[{'permissionId':str(p['id']),'scope':'OWN'} for p in perms if p['code'] in ['dashboard.view','crm.prospect.view','crm.prospect.create']]
r=call('/roles',a,{'name':'Test Commercial Dynamic','code':'TEST_COMMERCIAL_DYNAMIC','permissions':assign},status=201)
rid=str(r['id'])
u=call('/users',a,{'firstName':'Test','lastName':'Dynamic','email':'dynamic@rbac.test','password':'disposable-user-password','agencyId':str(agency),'roles':['TEST_COMMERCIAL_DYNAMIC']},status=201)
d=call('/auth/login',body={'email':'dynamic@rbac.test','password':'disposable-user-password'}); t=d['accessToken']
assert d['user']['role']['code']=='TEST_COMMERCIAL_DYNAMIC'
assert '*' not in [p['code'] for p in d['user']['permissions']]
call('/dashboard/overview',t);call('/leads',t);call('/sales',t,status=403);call('/roles',t,status=403)
# La propriété CRM exige la capacité de suivi, distincte de la simple création.
assign += [{'permissionId':str(p['id']),'scope':'OWN'} for p in perms if p['code']=='crm.prospect.update']
call('/roles/'+rid,a,{'permissions':assign},method='PATCH')
lead=call('/leads',t,{'title':'Test own','lastName':'Dynamic','email':'lead@rbac.test'},status=201)
other=call('/leads',a,{'title':'Other owner','lastName':'Other','email':'other@rbac.test'},status=201)
assert str(lead['id']) in [str(x['id']) for x in call('/leads',t)]
assert str(other['id']) not in [str(x['id']) for x in call('/leads',t)]
call('/leads/'+str(other['id']),t,status=404)
second=call('/agencies',a,{'name':'Test Second Agency','code':'TEST-SECOND'},status=201)
call('/users',a,{'firstName':'Second','lastName':'Dynamic','email':'second@rbac.test','password':'disposable-user-password','agencyId':str(second['agencyId']),'roles':['TEST_COMMERCIAL_DYNAMIC']},status=201)
t2=call('/auth/login',body={'email':'second@rbac.test','password':'disposable-user-password'})['accessToken']
foreign=call('/leads',t2,{'title':'Foreign agency','lastName':'Foreign','email':'foreign@rbac.test'},status=201)
agency_assign=[{**p,'scope':'AGENCY'} for p in assign]
call('/roles/'+rid,a,{'permissions':agency_assign},method='PATCH')
assert str(other['id']) in [str(x['id']) for x in call('/leads',t)]
assert str(foreign['id']) not in [str(x['id']) for x in call('/leads',t)]
call('/leads/'+str(foreign['id']),t,status=404)
call('/roles/'+rid,a,{'code':'DIRECTOR','name':'Dynamic renamed'},method='PATCH')
call('/sales',t,status=403);call('/leads',t)
call('/roles/'+rid,a,{'permissions':[]},method='PATCH')
call('/leads',t,status=403);call('/dashboard/overview',t,status=403)
call('/roles/'+rid,a,{'permissions':assign},method='PATCH');call('/leads',t)
call('/roles/'+rid+'/status',a,{'isActive':False},method='PATCH');call('/leads',t,status=403)
call('/roles/'+rid+'/status',a,{'isActive':True},method='PATCH')
call('/roles',a,{'name':'Fake super','code':'SUPER_ADMIN'},status=403)
call('/roles/'+str(roles[0]['id']),a,{'name':'Mutated'},method='PATCH',status=403)
call('/users/'+str(admin['user']['id']),a,{'roles':['DIRECTOR']},method='PATCH',status=409)
print(json.dumps({'fresh_roles':roles,'permissions':len(perms),'dynamic_create_assign_allow_deny_scope_own_rename_revoke_all_disable':True,'reserved_super_and_system_protection':True},ensure_ascii=False,indent=2))
