import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('migration 103 reste additive et fournit catalogue, devis multi et pro formas',()=>{
  const sql=read('database/migrations/103_crm_commercial_documents.sql');
  for(const fragment of ['ADD COLUMN legal_form','CREATE TABLE commercial_models','CREATE TABLE commercial_model_images','ADD COLUMN commercial_model_id','CREATE TABLE proformas','CREATE TABLE proforma_items','proformas.issue'])assert.match(sql,new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.doesNotMatch(sql,/DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/i);
});

test('les parcours devis et pro forma exposent idempotence, lignes multiples et archivage',()=>{
  const quotation=read('src/modules/quotations/quotation.service.ts'),proforma=read('src/modules/proformas/proforma.routes.ts');
  assert.match(quotation,/clientRequestId/);
  assert.match(quotation,/rawItems\.length>20/);
  assert.doesNotMatch(quotation.slice(quotation.indexOf('async function createFlexible'),quotation.indexOf('export async function create')),/UPDATE opportunities SET stage/);
  assert.match(proforma,/sourceQuotationId/);
  assert.match(proforma,/requireBusinessArchive/);
  assert.match(proforma,/status!=='draft'/);
});

test('catalogue, pro forma directe et snapshots sont raccordés de bout en bout',()=>{
  const catalog=read('src/modules/vehicles/commercial-catalog.routes.ts');
  const proforma=read('src/modules/proformas/proforma.routes.ts');
  const pdf=read('src/modules/documents/commercial-document.ts');
  const ui=read('../frontend/src/modules/proformas/ProformasPage.tsx');
  const catalogUi=read('../frontend/src/modules/vehicles/CommercialCatalogPage.tsx');
  for(const endpoint of ["post('/commercial-models'","post('/commercial-models/:id/images'","/primary'","/images/order'","delete('/commercial-models/:id/images/:imageId'"])assert.match(catalog,new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(catalog,/validateVehicleImages/);assert.match(catalog,/withStagedVehicleImages/);assert.match(catalog,/deleteVehicleImageFile/);
  assert.match(proforma,/ensureCustomer\(connection,opportunity/);assert.match(proforma,/customer_snapshot/);assert.match(proforma,/if\(current\.status==='issued'\)return/);
  assert.match(pdf,/FACTURE PRO FORMA/);assert.match(pdf,/selected_images_snapshot/);assert.match(pdf,/customer_snapshot/);
  assert.match(ui,/Prospect CRM/);assert.match(ui,/Ajouter un autre véhicule/);assert.match(ui,/imageIds/);assert.match(ui,/document\(s\) récent/);
  assert.match(catalogUi,/Galerie du modèle/);assert.match(catalogUi,/primaryImage/);assert.match(catalogUi,/orderImages/);assert.match(catalogUi,/removeImage/);
});
