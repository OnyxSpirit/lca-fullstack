import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('GED-VEH-01..08 réutilise le dépôt central avec rattachement véhicule verrouillé par ged.upload',()=>{
  const detail=read('../src/modules/vehicles/VehicleDetailPage.tsx'),ged=read('../src/modules/documents/DocumentsGedPage.tsx');
  assert.match(detail,/canUploadDocuments=can\('ged\.upload'\)/);
  assert.match(detail,/Ajouter un document/);
  assert.match(detail,/initialEntity=\{\{entityType:'vehicle',entityId:vehicle\.id/);
  assert.match(detail,/onSuccess=\{\(\)=>void vehicleQuery\.refetch\(\)\}/);
  assert.match(detail,/import \{ UploadModal \} from '\.\.\/documents\/DocumentsGedPage'/);
  assert.match(ged,/export function UploadModal/);
  assert.match(ged,/useUploadDocument\(\)/);
});

test('SALE-DISCOUNT-01..08 garde un champ vide, transforme le vide en zéro et bloque sous le minimum',()=>{
  const sale=read('../src/modules/sales/SaleWizardModal.tsx'),hooks=read('../src/api/erpHooks.ts');
  assert.match(sale,/\[discount,setDiscount\]=useState\(''\)/);
  assert.match(sale,/placeholder="Montant de la remise"/);
  assert.match(sale,/discountValue=discount===''\?0:Number\(discount\)/);
  assert.match(sale,/minimumAllowed=Math\.max\(configuredMinimum>0\?configuredMinimum:0,acquisitionCost\?\?0\)/);
  assert.match(sale,/discountValue<=maxDiscount/);
  assert.match(sale,/Cette remise ferait passer le prix de vente sous le prix minimum autorisé/);
  assert.match(hooks,/\/sales\/vehicles\/\$\{vehicleId\}\/pricing-guard/);
});

