import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('CRM distingue absence, accès et vente non accessible',()=>{const page=read('../src/modules/crm/CrmPage.tsx'),hooks=read('../src/api/erpHooks.ts');for(const value of ['Aucune vente associée','Consulter la vente','pas autorisé à la consulter'])assert.match(page,new RegExp(value));assert.match(hooks,/saleAssociation/)});
test('Ventes affiche une confirmation directe tout en conservant ordered historique',()=>{const page=read('../src/modules/sales/SaleDetailPage.tsx');assert.match(page,/RESERVATION: 'FINANCEMENT_VALIDE'/);assert.match(page,/COMMANDE: 'FINANCEMENT_VALIDE'/);assert.match(page,/FINANCEMENT_VALIDE: 'Confirmer la vente'/);assert.doesNotMatch(page,/Confirmer la commande/)});
