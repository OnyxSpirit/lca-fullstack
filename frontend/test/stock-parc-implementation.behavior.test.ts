import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const list=read('../src/modules/vehicles/VehiclesListPage.tsx');
const detail=read('../src/modules/vehicles/VehicleDetailPage.tsx');
const create=read('../src/modules/vehicles/NewVehicleModal.tsx');
const edit=read('../src/modules/vehicles/EditVehicleModal.tsx');
const transfer=read('../src/modules/vehicles/VehicleTransferModal.tsx');
const settings=read('../src/modules/settings/VehicleLocationsSettings.tsx');
const saleWizard=read('../src/modules/sales/SaleWizardModal.tsx');
const quotation=read('../src/modules/crm/QuotationModal.tsx');
const reports=read('../src/modules/reports/ReportsPage.tsx');

test('LIST UI compteurs, affectation précise, état vide et pagination serveur',()=>{
  for(const token of ['Parc automobile','Showroom','Non affectés','Toutes les affectations','Non affecté','Affichage','Précédent','Suivant'])assert.match(list,new RegExp(token));
  assert.match(list,/pageSize=20/);
  assert.match(list,/useEffect\(\(\)=>setPage\(1\)/);
  assert.match(list,/Aucun véhicule ne correspond à vos critères/);
});

test('DETAIL UI transferts, workflows, dossiers, historique et photos',()=>{
  for(const token of ['Transférer','Créer Vente','Voir la vente','Garantie constructeur','Historique des prix','Monter','Descendre','Archiver le véhicule'])assert.match(detail,new RegExp(token));
  assert.doesNotMatch(detail,/Proposition Commerciale|Établir une Proposition/);
  assert.match(transfer,/Motif obligatoire/);
  assert.match(transfer,/Non affecté/);
});

test('FIN UI cinq coûts, devise concession et séparation de l’affectation',()=>{
  for(const token of ['purchasePrice','refurbishmentCost','transportCost','administrativeCost','additionalCosts'])assert.match(create,new RegExp(token));
  assert.match(create,/currencyCode/);
  assert.match(edit,/vehicle\.currencyCode/);
  assert.doesNotMatch(edit,/>Emplacement</);
  assert.match(detail,/Transport HT/);
  assert.match(detail,/Frais administratifs HT/);
  assert.match(detail,/Autres frais HT/);
  assert.doesNotMatch(detail,/\/\s*1\.2/);
  for(const source of [create,edit])for(const label of ['Prix catalogue HT','Prix (?:de )?vente HT','Prix minimum HT'])assert.match(source,new RegExp(label));
  assert.match(saleWizard,/currencyCode/);
  assert.doesNotMatch(saleWizard,/Remise commerciale \(XAF\)/);
  assert.match(quotation,/sellingPriceHT/);
  assert.match(reports,/estimation selon coûts actuels/);
});

test('ADMIN UI crée, renomme et active sans suppression physique',()=>{
  for(const token of ['Créer','Renommer','Désactiver','Réactiver','PARC','SHOWROOM'])assert.match(settings,new RegExp(token));
  assert.doesNotMatch(settings,/Supprimer/);
});
