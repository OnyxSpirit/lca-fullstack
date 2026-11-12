import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('CRM expose une association de vente réelle sans divulguer une vente inaccessible',()=>{const source=read('../src/modules/crm/crm.routes.ts');assert.match(source,/linked_sale\.id sale_id/);assert.match(source,/permissions\.get\('sales\.view'\)/);assert.match(source,/state:'INACCESSIBLE'/);assert.match(source,/state:'ACCESSIBLE'/)});
test('CRM autorise la conversion depuis won uniquement sans vente réelle',()=>{const page=read('../../frontend/src/modules/crm/CrmPage.tsx');assert.match(page,/\['OFFRE','NEGOCIATION','GAGNE'\]/);assert.match(page,/saleAssociation\.state==='NONE'/);assert.match(page,/Consulter la vente/);assert.doesNotMatch(page,/Déjà transformée en vente/)});
test('la migration d’unicité est additive et possède un préflight non destructif',()=>{const sql=read('../database/migrations/118_sales_opportunity_uniqueness.sql');assert.match(sql,/migration_conflict_type/);assert.match(sql,/HAVING COUNT\(\*\)>1/);assert.match(sql,/UNIQUE KEY uq_sales_opportunity_id \(opportunity_id\)/);assert.doesNotMatch(sql,/DELETE|UPDATE sales|DROP TABLE/i)});
