# Run only against the disposable MySQL 8.4 stack in fresh-rbac.compose.yml.
import json, subprocess, urllib.error, urllib.parse, urllib.request

BASE='http://127.0.0.1:13082/api'
COMPOSE=['docker','compose','-f','test/fresh-rbac.compose.yml']

def call(path,token=None,body=None,method=None,status=200):
 req=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})},method=method or ('POST' if body is not None else 'GET'))
 try:
  with urllib.request.urlopen(req) as response: code=response.status; data=response.read()
 except urllib.error.HTTPError as error: code=error.code; data=error.read()
 assert code==status,(path,code,data.decode())
 return json.loads(data) if data else None

def mysql(sql):
 result=subprocess.run(COMPOSE+['exec','-T','mysql','mysql','-N','-B','-urbac_test','-pdisposable-rbac-password','rbac_test'],input=sql,text=True,capture_output=True,check=True)
 return result.stdout.strip()

admin=call('/auth/login',body={'email':'admin@rbac.test','password':'Disposable-Rbac-Admin-2026!'})
root=admin['accessToken']; a1=str(admin['user']['agencyId']); admin_id=str(admin['user']['id'])
permissions={permission['code']:str(permission['id']) for permission in call('/permissions',root)}
codes=['dashboard.view','customers.view','vehicles.view','vehicles.financials.view','sales.view','billing.view','billing.invoice.view','billing.payment.view','parts.catalog.view','parts.stock.view','parts.reporting.view']

def assignments(scopes): return [{'permissionId':permissions[code],'scope':scopes[code]} for code in codes]
base_scopes={code:'GLOBAL' for code in codes}
role=call('/roles',root,{'name':'RBAC02 MySQL','code':'RBAC02_MYSQL','permissions':assignments(base_scopes)},status=201)
role_id=str(role['id'])

mysql("""
INSERT INTO concessions(name,code) VALUES('RBAC02 C2','RBAC02-C2');
SET @c1=(SELECT concession_id FROM agencies WHERE id=%s);
SET @c2=(SELECT id FROM concessions WHERE code='RBAC02-C2');
INSERT INTO agencies(concession_id,name,code) VALUES(@c1,'RBAC02 A2','RBAC02-A2'),(@c2,'RBAC02 B1','RBAC02-B1');
"""%a1)
a2,b1=mysql("SELECT id FROM agencies WHERE code IN('RBAC02-A2','RBAC02-B1') ORDER BY code").splitlines()
user=call('/users',root,{'firstName':'RBAC02','lastName':'Actor','email':'rbac02@mysql.test','password':'Disposable-Rbac02-2026!','agencyId':a1,'roles':['RBAC02_MYSQL']},status=201)
actor_id=str(user['id'])
token=call('/auth/login',body={'email':'rbac02@mysql.test','password':'Disposable-Rbac02-2026!'})['accessToken']

mysql("""
INSERT INTO brands(name,code) VALUES('RBAC02 Brand','RBAC02-BRAND'); SET @brand=LAST_INSERT_ID();
INSERT INTO models(brand_id,name,code) VALUES(@brand,'RBAC02 Model','RBAC02-MODEL'); SET @model=LAST_INSERT_ID();
INSERT INTO versions(model_id,name,code) VALUES(@model,'RBAC02 Version','RBAC02-VERSION'); SET @version=LAST_INSERT_ID();
INSERT INTO customers(customer_code,agency_id,first_name,last_name,assigned_user_id,created_by) VALUES
 ('RBAC02-C-A1',%s,'Client','A1',%s,%s),('RBAC02-C-A2',%s,'Client','A2',NULL,%s),('RBAC02-C-B1',%s,'Client','B1',NULL,%s);
SET @ca1=(SELECT id FROM customers WHERE customer_code='RBAC02-C-A1');
SET @ca2=(SELECT id FROM customers WHERE customer_code='RBAC02-C-A2');
SET @cb1=(SELECT id FROM customers WHERE customer_code='RBAC02-C-B1');
INSERT INTO vehicles(version_id,agency_id,vin,stock_number,status,entry_date,purchase_price,catalog_price,sale_price,minimum_price,created_by) VALUES
 (@version,%s,'RBAC02VIN000000001','RBAC02-V-A1','available',CURDATE(),100,200,190,150,%s),
 (@version,%s,'RBAC02VIN000000002','RBAC02-V-A2','available',CURDATE(),110,210,200,160,%s),
 (@version,%s,'RBAC02VIN000000003','RBAC02-V-B1','available',CURDATE(),120,220,210,170,%s);
SET @va1=(SELECT id FROM vehicles WHERE stock_number='RBAC02-V-A1');
SET @va2=(SELECT id FROM vehicles WHERE stock_number='RBAC02-V-A2');
SET @vb1=(SELECT id FROM vehicles WHERE stock_number='RBAC02-V-B1');
INSERT INTO sales(sale_number,customer_id,agency_id,salesperson_id,status,subtotal,total,balance_due,sold_at,created_by) VALUES
 ('RBAC02-S-A1',@ca1,%s,%s,'confirmed',1000,1000,600,NOW(),%s),
 ('RBAC02-S-A2',@ca2,%s,NULL,'confirmed',2000,2000,1300,NOW(),%s),
 ('RBAC02-S-B1',@cb1,%s,NULL,'confirmed',3000,3000,2200,NOW(),%s),
 ('RBAC02-S-CROSS',@ca1,%s,NULL,'confirmed',4000,4000,3100,NOW(),%s);
SET @sa1=(SELECT id FROM sales WHERE sale_number='RBAC02-S-A1');
SET @sa2=(SELECT id FROM sales WHERE sale_number='RBAC02-S-A2');
SET @sb1=(SELECT id FROM sales WHERE sale_number='RBAC02-S-B1');
INSERT INTO sale_items(sale_id,vehicle_id,description,quantity,catalog_price,unit_price,discount,tax_rate,line_total) VALUES
 (@sa1,@va1,'A1',1,1000,1000,0,0,1000),(@sa2,@va2,'A2',1,2000,2000,0,0,2000),(@sb1,@vb1,'B1',1,3000,3000,0,0,3000);
INSERT INTO invoices(invoice_number,customer_id,agency_id,sale_id,invoice_type,status,issue_date,total,amount_paid,balance_due,created_by) VALUES
 ('RBAC02-I-A1',@ca1,%s,@sa1,'vehicle','partially_paid',CURDATE(),1000,400,600,%s),
 ('RBAC02-I-A2',@ca2,%s,@sa2,'vehicle','partially_paid',CURDATE(),2000,700,1300,%s),
 ('RBAC02-I-B1',@cb1,%s,@sb1,'vehicle','partially_paid',CURDATE(),3000,800,2200,%s);
INSERT INTO parts(reference,name,purchase_price,sale_price) VALUES('RBAC02-PART','RBAC02 Part',50,80); SET @part=LAST_INSERT_ID();
INSERT INTO part_stocks(part_id,agency_id,current_stock,min_stock,max_stock) VALUES(@part,%s,10,1,20),(@part,%s,20,2,30),(@part,%s,30,3,40);
"""%(a1,actor_id,admin_id,a2,admin_id,b1,admin_id,a1,admin_id,a2,admin_id,b1,admin_id,a1,actor_id,admin_id,a2,admin_id,b1,admin_id,b1,admin_id,a1,admin_id,a2,admin_id,b1,admin_id,a1,a2,b1))

def update(scopes): call('/roles/'+role_id,root,{'permissions':assignments(scopes)},method='PATCH')
def items(value): return value.get('items',value) if isinstance(value,dict) else value

# Dashboard: la permission d'entrée et chaque permission métier bornent ensemble les KPI.
scopes={**base_scopes,'dashboard.view':'AGENCY','sales.view':'GLOBAL','vehicles.view':'GLOBAL','billing.view':'GLOBAL'};update(scopes)
overview=call('/dashboard/overview',token)
assert overview['sales']['currentMonth']==1 and overview['vehicles']['total']==1 and overview['revenue']['current']==1000,overview
scopes={**base_scopes,'dashboard.view':'GLOBAL','sales.view':'AGENCY','vehicles.view':'AGENCY','billing.view':'AGENCY'};update(scopes)
overview=call('/dashboard/overview',token)
assert overview['sales']['currentMonth']==1 and overview['vehicles']['total']==1 and overview['revenue']['current']==1000,overview

# Véhicules, ventes et facturation: la liste principale peut être globale, le champ secondaire reste AGENCY.
scopes={**base_scopes,'vehicles.view':'GLOBAL','vehicles.financials.view':'AGENCY','sales.view':'GLOBAL','billing.invoice.view':'GLOBAL','billing.payment.view':'AGENCY'};update(scopes)
vehicles=items(call('/vehicles?page=1&pageSize=100',token)); by_stock={row['stockNumber']:row for row in vehicles}
assert 'purchasePrice' in by_stock['RBAC02-V-A1'] and 'purchasePrice' not in by_stock['RBAC02-V-A2'] and 'purchasePrice' not in by_stock['RBAC02-V-B1']
sales=items(call('/sales?page=1&pageSize=100',token)); by_sale={row['sale_number']:row for row in sales}
assert by_sale['RBAC02-S-A1']['invoice_amount_paid'] is not None and by_sale['RBAC02-S-A2']['invoice_amount_paid'] is None and by_sale['RBAC02-S-B1']['invoice_amount_paid'] is None
invoices=items(call('/invoices?page=1&pageSize=100',token)); by_invoice={row['invoice_number']:row for row in invoices}
assert by_invoice['RBAC02-I-A1']['amount_paid'] is not None and by_invoice['RBAC02-I-A2']['amount_paid'] is None and by_invoice['RBAC02-I-B1']['amount_paid'] is None

# Client 360: customers.view GLOBAL ne dilate pas une section AGENCY et le rattachement client conserve son agence.
scopes={**base_scopes,'customers.view':'GLOBAL','vehicles.view':'AGENCY','sales.view':'AGENCY','billing.invoice.view':'AGENCY','billing.payment.view':'AGENCY'};update(scopes)
b1_customer=mysql("SELECT id FROM customers WHERE customer_code='RBAC02-C-B1'")
a1_customer=mysql("SELECT id FROM customers WHERE customer_code='RBAC02-C-A1'")
foreign_360=call('/customers/'+b1_customer+'/360',token)
assert foreign_360['sales']==[] and foreign_360['invoices']==[] and foreign_360['vehicles']==[]
local_360=call('/customers/'+a1_customer+'/360',token)
assert [sale['saleNumber'] for sale in local_360['sales']]==['RBAC02-S-A1']

# Pièces: catalogue GLOBAL choisit une agence, reporting AGENCY ne révèle les prix que dans A1.
scopes={**base_scopes,'parts.catalog.view':'GLOBAL','parts.stock.view':'GLOBAL','parts.reporting.view':'AGENCY'};update(scopes)
local_part=call('/parts?agencyId='+a1,token)[0]
assert local_part['purchase_price'] is not None
call('/parts?agencyId='+b1,token,status=403)
scopes={**scopes,'parts.reporting.view':'OWN'};update(scopes)
assert call('/parts?agencyId='+a1,token)[0]['purchase_price'] is None

# Deux rôles dynamiques identiques obtiennent exactement le même résultat.
clone=call('/roles',root,{'name':'RBAC02 Clone','code':'RBAC02_CLONE','permissions':assignments(scopes)},status=201)
clone_user=call('/users',root,{'firstName':'RBAC02','lastName':'Clone','email':'rbac02-clone@mysql.test','password':'Disposable-Rbac02-2026!','agencyId':a1,'roles':['RBAC02_CLONE']},status=201)
clone_token=call('/auth/login',body={'email':'rbac02-clone@mysql.test','password':'Disposable-Rbac02-2026!'})['accessToken']
assert call('/parts?agencyId='+a1,clone_token)==call('/parts?agencyId='+a1,token)

print(json.dumps({'mysql':'8.4','agencies':{'A1':a1,'A2':a2,'B1':b1},'dashboard':True,'client360':True,'vehicles':True,'sales':True,'billing':True,'parts':True,'dynamic_role_parity':True},indent=2))
