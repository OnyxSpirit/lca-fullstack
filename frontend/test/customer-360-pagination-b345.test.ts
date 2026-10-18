import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{CUSTOMER_360_PAGE_KEYS,CUSTOMER_360_PAGE_SIZES,newCustomer360Pages,synchronizeCustomer360Pages}from'../src/modules/customers/customer360Pagination';

const page=readFileSync(new URL('../src/modules/customers/CustomerDetailPage.tsx',import.meta.url),'utf8');

test('B345-PAG-01 initialise indépendamment les sept collections',()=>{
 const pages=newCustomer360Pages();
 assert.deepEqual(CUSTOMER_360_PAGE_KEYS,Object.keys(pages));
 assert.ok(Object.values(pages).every(value=>value===1));
});

test('B345-PAG-02 accepte uniquement les tailles discrètes prévues par le contrat',()=>{
 assert.deepEqual(CUSTOMER_360_PAGE_SIZES,[7,15,30]);
 assert.match(page,/CUSTOMER_360_PAGE_SIZES\.includes/);
 assert.match(page,/setPages\(newCustomer360Pages\(\)\)/);
});

test('B345-PAG-03 recale une page supprimée sur la page normalisée du serveur',()=>{
 const current={...newCustomer360Pages(),salesPage:3,invoicesPage:4};
 const next=synchronizeCustomer360Pages(current,{sales:{page:2,totalPages:2},invoices:{page:1,totalPages:0}});
 assert.equal(next.salesPage,2);assert.equal(next.invoicesPage,1);
 assert.equal(next.vehiclesPage,1);
});

test('B345-PAG-04 ne boucle pas quand les pages sont déjà synchronisées',()=>{
 const current={...newCustomer360Pages(),salesPage:2};
 const next=synchronizeCustomer360Pages(current,{sales:{page:2,totalPages:2}});
 assert.equal(next,current);
});

test('B345-PAG-05 ignore les listes courtes et les métadonnées invalides',()=>{
 const current={...newCustomer360Pages(),timelinePage:2};
 assert.equal(synchronizeCustomer360Pages(current,{timeline:[],sales:{page:0}}),current);
});

test('B345-PAG-06 la navigation utilise les pages serveur et couvre les bornes',()=>{
 assert.match(page,/Number\(data\.page\)/);
 assert.match(page,/onPage\(1\)/);
 assert.match(page,/onPage\(totalPages\)/);
 assert.match(page,/disabled=\{page<=1\}/);
 assert.match(page,/disabled=\{page>=totalPages\}/);
});

test('B345-PAG-07 contacts et documents restent volontairement hors pagination 360',()=>{
 assert.doesNotMatch(page,/contactsPage|documentsPage/);
 assert.match(page,/useEntityDocuments\('customer',id,canViewDocuments\)/);
});

test('B345-PAG-08 change de client sans conserver les anciennes pages',()=>{
 assert.match(page,/useEffect\(\(\)=>\{setPages\(newCustomer360Pages\(\)\)\},\[id\]\)/);
});

test('B345-PAG-09 masque le sélecteur pour une liste courte à la taille par défaut',()=>{
 assert.match(page,/showPageSize=pageSize!==7\|\|activePaginationTotal>7/);
 assert.match(page,/\{showPageSize&&<label/);
});
