import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const hooks=read('../src/api/erpHooks.ts'),customer=read('../src/modules/customers/CustomerDetailPage.tsx'),showroom=read('../src/modules/showroom/ShowroomPage.tsx'),delivery=read('../src/modules/deliveries/DeliveriesPage.tsx');

test('C360-PAG-01..10 utilise le contrat serveur compatible et conserve les actions',()=>{
 assert.match(hooks,/customers\/\$\{id\}\/360\?\$\{pageParams\(\{\.\.\.pages,pageSize:7\}\)\}/);
 for(const section of['timeline','opportunities','vehicles','sales','quotations','repairOrders','invoices'])assert.match(customer,new RegExp(`${section}Page`));
 assert.match(customer,/navigate\(`\/sales\/\$\{s\.id\}`\)/);assert.match(customer,/setActiveQuickActionModal\('or'/);assert.match(customer,/Aucun événement/);
});

test('SHOWROOM-DATE-01..12 propose tous, aujourd’hui et période inclusive',()=>{
 assert.match(showroom,/dateMode==='all'/);assert.match(showroom,/dateMode==='today'/);assert.match(showroom,/Période personnalisée/);
 assert.match(showroom,/from:dateFrom\|\|undefined,to:dateTo\|\|undefined/);assert.match(showroom,/metrics\.waiting\?\?waiting\.length/);
 assert.match(showroom,/AssignmentSelect/);assert.match(hooks,/\["showroom","board",filters\]/);
});

test('DELIVERY-VIEW/PAG-01..14 partage source, actions et filtres entre cartes et liste',()=>{
 assert.match(delivery,/useDeliveriesPageQuery\(\{search:deferredSearch,status,page,pageSize:7\}/);
 assert.match(delivery,/view==='cards'/);assert.match(delivery,/>Cartes</);assert.match(delivery,/>Liste</);
 assert.equal((delivery.match(/const DeliveryActions=/g)??[]).length,1);assert.match(delivery,/useEffect\(\(\)=>setPage\(1\),\[deferredSearch,status\]\)/);
 assert.match(delivery,/Aucune livraison ne correspond aux filtres/);assert.match(delivery,/Page \{page\} \/ \{Math\.max\(1,totalPages\)\}/);
});
