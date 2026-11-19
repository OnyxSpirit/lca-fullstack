import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('QGP-UI-001 achats directs consomme exclusivement la page serveur',()=>{
 const panel=read('src/modules/parts/DirectPurchasesPanel.tsx');
 assert.match(panel,/apiRequest<PurchasePage>/);assert.match(panel,/list\.data\?\.items/);assert.match(panel,/ServerPagination/);
 for(const token of['pageSize','search','status','purchaseKind','fundingSource','sortBy','sortOrder'])assert.match(panel,new RegExp(token));
 assert.doesNotMatch(panel,/useClientPagination/);
});

test('QGP-UI-002 fiscalité affiche les agrégats filtrés et la page serveur',()=>{
 const panel=read('src/modules/hr/FiscalAdministration.tsx');
 assert.match(panel,/apiRequest<ObligationPage>/);assert.match(panel,/obligations\.data\?\.items/);assert.match(panel,/ServerPagination/);
 for(const token of['declaredAmount','paidAmount','outstandingAmount','taxTypeId','from','to','sortBy','sortOrder'])assert.match(panel,new RegExp(token));
 assert.doesNotMatch(panel,/useClientPagination/);
});

test('QGP-UI-003 SAV harmonise facturation, transit et journal',()=>{
 const panel=read('src/modules/service/SavBusinessSections.tsx');
 assert.match(panel,/pageSize,setPageSize\]=useState\(10\)/);
 assert.match(panel,/transfers:\{items:any\[\];total:number;page:number;pageSize:number;totalPages:number\}/);
 assert.equal((panel.match(/<ServerPagination/g)??[]).length,3);
 assert.doesNotMatch(panel,/pageSize:'25'/);assert.doesNotMatch(panel,/page:1,pageSize:250/);
});

test('QGP-UI-004 ventes directes consomme une page serveur filtrable',()=>{
 const panel=read('src/modules/parts/PartSalesPanel.tsx');
 assert.match(panel,/apiRequest<\{items:Sale\[\];total:number;page:number;pageSize:number;totalPages:number\}>/);
 assert.match(panel,/sales\.data\?\.items\.map/);assert.match(panel,/ServerPagination/);
 for(const token of['search','status','page','pageSize'])assert.match(panel,new RegExp(token));
});
