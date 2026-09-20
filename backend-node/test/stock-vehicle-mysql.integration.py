import json
import urllib.error
import urllib.parse
import urllib.request

BASE='http://127.0.0.1:13082/api'

def call(path,token=None,body=None,method=None,status=200):
    request=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})},method=method or ('POST' if body is not None else 'GET'))
    try:
        with urllib.request.urlopen(request) as response:
            code=response.status; data=response.read()
    except urllib.error.HTTPError as error:
        code=error.code; data=error.read()
    assert code==status,(path,code,data.decode())
    return json.loads(data) if data else None

def get(path,token,params=None):
    return call(path+('?' + urllib.parse.urlencode(params) if params else ''),token)

admin_login=call('/auth/login',body={'email':'admin@rbac.test','password':'disposable-admin-password'})
admin=admin_login['accessToken']; agency_a=admin_login['user']['agencyId']
permissions=call('/permissions',admin)
vehicle_permission=str(next(permission['id'] for permission in permissions if permission['code']=='vehicles.view'))

def create_actor(code,scope,email):
    role=call('/roles',admin,{'name':code.replace('_',' ').title(),'code':code,'permissions':[{'permissionId':vehicle_permission,'scope':scope}]},status=201)
    call('/users',admin,{'firstName':'Stock','lastName':scope,'email':email,'password':'stock-validation-user','agencyId':agency_a,'roles':[code]},status=201)
    return call('/auth/login',body={'email':email,'password':'stock-validation-user'})['accessToken'],role

agency_token,_=create_actor('STOCK_AGENCY_TEST','AGENCY','stock-agency@test.local')
concession_token,_=create_actor('STOCK_CONCESSION_TEST','CONCESSION','stock-concession@test.local')
global_token,_=create_actor('STOCK_GLOBAL_TEST','GLOBAL','stock-global@test.local')

agency_options=get('/vehicles/filter-options',agency_token,{'view':'all'})
assert [brand['name'] for brand in agency_options['brands']]==['Toyota']
toyota=agency_options['brands'][0]['id']
toyota_options=get('/vehicles/filter-options',agency_token,{'view':'all','brandId':toyota})
assert [model['name'] for model in toyota_options['models']]==['Corolla','Hilux']
hilux=next(model['id'] for model in toyota_options['models'] if model['name']=='Hilux')

assert get('/vehicles',agency_token)['total']==2
assert get('/vehicles',agency_token,{'view':'all'})['total']==3
assert get('/vehicles',agency_token,{'view':'all','brandId':toyota})['total']==3
assert get('/vehicles',agency_token,{'view':'active','brandId':toyota,'modelId':hilux})['total']==1
assert get('/vehicles',agency_token,{'view':'all','brandId':toyota,'modelId':hilux,'status':'sold'})['total']==1
assert get('/vehicles',agency_token,{'modelId':'999999'})['total']==0
page=get('/vehicles',agency_token,{'brandId':toyota,'pageSize':1,'page':1})
assert len(page['items'])==1 and page['total']==2
assert get('/vehicles',concession_token,{'view':'all'})['total']==4
assert get('/vehicles',global_token,{'view':'all'})['total']==5

stats=get('/vehicles/stats',agency_token)
assert stats['availableForSale']==2 and stats['sold']==1
customer=call('/customers',admin,{'customerType':'individual','lastName':'Stock','email':'stock-customer@test.local','agencyId':agency_a},status=201)
available_hilux=get('/vehicles',admin,{'status':'available','modelId':hilux})['items'][0]
sale=call('/sales',admin,{'customerId':customer['id'],'vehicleId':available_hilux['id'],'agencyId':agency_a,'discount':0,'depositAmount':0,'idempotencyKey':'stock-validation-sale'},status=201)
after_reservation=get('/vehicles/stats',agency_token)
assert after_reservation['availableForSale']==1 and after_reservation['reserved']==1
call('/sales/'+sale['id']+'/status',admin,{'status':'ordered'},method='PATCH')
call('/sales/'+sale['id']+'/status',admin,{'status':'confirmed'},method='PATCH')
after_confirmation=get('/vehicles/stats',agency_token)
assert after_confirmation['availableForSale']==1 and after_confirmation['sold']==2

print(json.dumps({'agency_active_total':2,'agency_all_total':3,'brand_toyota_all':3,'brand_toyota_model_hilux_active':1,'brand_model_status_sold':1,'missing_model':0,'page_items':1,'page_total':2,'concession_total':4,'global_total':5,'available_before':2,'available_after_reservation':1,'available_after_confirmation':1},indent=2))
