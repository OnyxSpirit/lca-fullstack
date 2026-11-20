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

test('QGP-UI-005 paramètres explicites utilisent recherches et paginations indépendantes',()=>{
 for(const path of['src/modules/settings/DocumentReferencesSettings.tsx','src/modules/settings/DocumentMarksSettings.tsx','src/modules/settings/ManufacturersSettings.tsx','src/modules/settings/DeliveryServicesSettings.tsx','src/modules/settings/VehicleLocationsSettings.tsx','src/modules/deliveries/DeliveryChecklistTemplates.tsx']){
  const panel=read(path);assert.match(panel,/ClientPagination/,path);
 }
 const marks=read('src/modules/settings/DocumentMarksSettings.tsx');assert.match(marks,/label="signature\(s\)"/);assert.match(marks,/label="cachet\(s\)"/);
});

test('QGP-UI-006 analyses et automatisations comptables exposent la norme commune',()=>{
 const analysis=read('src/modules/treasury/AccountingAnalysisPanel.tsx'),automation=read('src/modules/treasury/AccountingAutomationPanels.tsx');
 assert.match(analysis,/ServerPagination/);assert.match(analysis,/ClientPagination/);assert.match(analysis,/pageSize,setPageSize\]=useState\(10\)/);
 assert.equal((automation.match(/<ServerPagination/g)??[]).length,2);
});

test('QGP-UI-007 premiers tableaux Journaux et Liaisons sont paginés indépendamment',()=>{
 const page=read('src/modules/treasury/AccountingPage.tsx');
 assert.match(page,/function Journals\(\)[\s\S]*useJournals\(page, pageSize\)[\s\S]*label="journal\(aux\) comptable\(s\)"/);
 assert.match(page,/function Mappings\(\)[\s\S]*mappingPage = useClientPagination\([\s\S]*"liaison\(s\) comptable\(s\)"/);
 assert.match(page,/mappingPage\.visible\.map/);
 assert.match(page,/mappingPage\.controls/);
});

test('FR-UI-001 les statuts financiers et opérations SAV ne rendent plus leurs codes techniques',()=>{
  const labels=read('src/lib/userFacingLabels.ts');
  const sav=read('src/modules/service/SavBusinessSections.tsx');
  for(const code of ['BALANCED_IN','BALANCED_OUT','PENDING','APPROVED','COMPLETED','CANCELLED'])assert.match(labels,new RegExp(`${code}:[^,}]+`));
  assert.match(sav,/financialStatusLabel\(invoice\.status\)/);
  assert.match(sav,/financialStatusLabel\(item\.status\)/);
  assert.match(sav,/savEventLabel\(item\.event_type\)/);
  assert.match(sav,/savEventOptions\.map/);
});

test('FR-UI-002 comptabilité, rapprochements et facturation utilisent les libellés centralisés',()=>{
  const advanced=read('src/modules/treasury/AccountingAdvancedPanels.tsx');
  const bank=read('src/modules/treasury/BankReconciliationPanel.tsx');
  const groups=read('src/modules/treasury/BankReconciliationGroupsPanel.tsx');
  const budget=read('src/modules/treasury/BudgetTreasuryPanel.tsx');
  const invoice=read('src/modules/billing/InvoiceDetailPage.tsx');
  const payments=read('src/modules/billing/InvoicePaymentComponents.tsx');
  for(const source of [advanced,bank,groups])assert.match(source,/accountingCodeLabel/);
  assert.match(bank,/accountingDiscrepancyOptions\.map/);
  assert.match(budget,/financialStatusLabel\(b\.status\)/);
  assert.match(budget,/financialStatusLabel\(x\.status\)/);
  assert.match(invoice,/financialStatusLabel\(item\.status\)/);
  assert.match(payments,/financialStatusLabel\(item\.status\)/);
});

test('FR-UI-003 les achats et ventes Pièces traduisent filtres, tableaux et détails',()=>{
  const labels=read('src/lib/userFacingLabels.ts');
  const purchases=read('src/modules/parts/DirectPurchasesPanel.tsx');
  const sales=read('src/modules/parts/PartSalesPanel.tsx');
  for(const code of ['SUPPLIER_CREDIT','AGENT_ADVANCE','CENTRAL_DISBURSEMENT','PARTIALLY_RECEIVED','QUARANTINED','PARTIAL_REFUND'])assert.match(labels,new RegExp(`${code}:[^,}]+`));
  for(const helper of ['directPurchaseStatusOptions','directPurchaseKindOptions','directPurchaseFundingOptions'])assert.match(purchases,new RegExp(`${helper}\\.map`));
  assert.match(purchases,/partsCodeLabel\(x\.purchase_kind\)/);
  assert.match(purchases,/partsCodeLabel\(x\.funding_source\)/);
  assert.match(sales,/partsCodeLabel\(x\.status\)/);
  assert.match(sales,/partsCodeLabel\(x\.condition_code\)/);
});

test('FR-UI-004 les approvisionnements, mouvements, factures fournisseurs et rapports traduisent leurs codes',()=>{
  const detail=read('src/modules/parts/SparePartDetailPage.tsx');
  const catalogue=read('src/modules/parts/SparePartsPage.tsx');
  const suppliers=read('src/modules/parts/SupplierInvoicesPanel.tsx');
  const queue=read('src/modules/parts/PartsWorkQueuePage.tsx');
  const reports=read('src/modules/reports/ReportsPage.tsx');
  for(const source of [detail,catalogue,suppliers,queue])assert.match(source,/partsCodeLabel/);
  assert.match(detail,/partsCodeLabel\(m\.movement_type\)/);
  assert.match(suppliers,/partsCodeLabel\(x\.payment_status\)/);
  assert.match(reports,/financialStatusLabel\(x\.decision_status\)/);
  assert.match(reports,/financialStatusLabel\(x\.claim_status\)/);
});
