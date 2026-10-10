import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';
import{renderCommercialDocument,renderDeliveryDocumentData,renderRepairOrderDocument,renderVehicleDocumentData}from'../src/modules/documents/commercial-document.js';
import{deriveWarrantyEligibility,warrantyContextForDocument,type WarrantyDocumentContext}from'../src/modules/documents/warranty-document-context.js';

const identity={legalName:'LCA',tradeName:'LCA',agencyName:'Agence',currencyCode:'XAF',logoCandidates:[]};
const contract=(overrides:Partial<WarrantyDocumentContext>={}):WarrantyDocumentContext=>({vehicleId:'10',saleId:'20',contractId:'30',contractDecision:'APPLICABLE',contractStatus:'PENDING_ACTIVATION',eligibility:'PLANNED',providerCode:'MFG',providerName:'Constructeur Automobile International au Nom Très Long',durationMonths:36,mileageLimit:100000,decisionAt:'2026-09-01',startDate:null,expiryDate:null,initialMileage:null,currentMileage:null,claim:null,...overrides});
const header={number:'DOC-001',document_date:'2026-09-27',agency_id:1,currency_code:'XAF',customer_name:'Client',subtotal:1000,discount_total:0,tax_total:180,total:1180,tax_mode:'TAXABLE',tax_rate_snapshot:18};
const items=[{description:'Véhicule',quantity:1,unit_price:1000,discount:0,tax_rate:18,line_total:1180}];

test('WDC-01..10 distingue tous les états contractuels sans inventer une expiration kilométrique',()=>{
 const now=new Date('2030-01-01T00:00:00Z');
 assert.equal(deriveWarrantyEligibility({decision:'UNDETERMINED',status:'PENDING_DECISION'},null,now),'UNDETERMINED');
 assert.equal(deriveWarrantyEligibility({decision:'NOT_APPLICABLE',status:'NOT_APPLICABLE'},null,now),'NOT_APPLICABLE');
 assert.equal(deriveWarrantyEligibility({decision:'APPLICABLE',status:'PENDING_ACTIVATION'},null,now),'PLANNED');
 assert.equal(deriveWarrantyEligibility({decision:'APPLICABLE',status:'ACTIVE',expiryDate:'2029-01-01'},10,now),'EXPIRED_BY_DATE');
 assert.equal(deriveWarrantyEligibility({decision:'APPLICABLE',status:'ACTIVE',expiryDate:'2031-01-01',mileageLimit:100000},null,now),'MILEAGE_REQUIRED');
 assert.equal(deriveWarrantyEligibility({decision:'APPLICABLE',status:'ACTIVE',expiryDate:'2031-01-01',mileageLimit:100000},100001,now),'EXPIRED_BY_MILEAGE');
 assert.equal(deriveWarrantyEligibility({decision:'APPLICABLE',status:'ACTIVE',expiryDate:'2031-01-01',mileageLimit:null},null,now),'ACTIVE');
});

test('WDC-11..17 applique la politique documentaire et distingue inconnu de zéro réel',()=>{
 assert.equal(warrantyContextForDocument(null,'sale'),null);
 assert.equal(warrantyContextForDocument(contract({contractDecision:'UNDETERMINED'}),'sale'),null);
 assert.equal(warrantyContextForDocument(contract({contractDecision:'NOT_APPLICABLE'}),'sale'),null);
 const unknown=contract({claim:{decisionStatus:'APPROVED',coverageMode:'PARTIAL',providerName:'MFG',authorizationReference:'AUT',allocationStatus:'DRAFT',amountsKnown:false,realTotal:null,manufacturerShare:null,customerShare:null,claimNumber:null,claimStatus:null,claimTotal:null,amountReceived:null,balanceDue:null}});
 assert.equal(warrantyContextForDocument(unknown,'workshop_invoice'),null);
 const zero=contract({claim:{...unknown.claim!,allocationStatus:'CONFIRMED',amountsKnown:true,realTotal:100,manufacturerShare:100,customerShare:0}});
 assert.equal(warrantyContextForDocument(zero,'workshop_invoice')?.claim?.customerShare,0);
 assert.equal(warrantyContextForDocument(contract(),'quotation')?.durationMonths,36);
});

test('WDC-18..25 génère les sections Garantie dans le design A4 commun',async()=>{
 const planned=contract(),active=contract({contractStatus:'ACTIVE',eligibility:'ACTIVE',startDate:'2026-10-01',expiryDate:'2029-10-01',initialMileage:25}),full=contract({claim:{decisionStatus:'APPROVED',coverageMode:'FULL',providerName:'MFG',authorizationReference:'AUT-1',allocationStatus:'CONFIRMED',amountsKnown:true,realTotal:1180,manufacturerShare:1180,customerShare:0,claimNumber:'CRE-1',claimStatus:'issued',claimTotal:1180,amountReceived:0,balanceDue:1180}});
 const pdfs=[await renderCommercialDocument('DEVIS',header as any,items as any,identity,planned,'CONTRACT_COMPACT'),await renderCommercialDocument('FACTURE',header as any,items as any,identity,active,'CONTRACT_ACTIVE'),await renderVehicleDocumentData({stockNumber:'STK',vehicleType:'new',brand:'M',model:'X',version:'V',vin:'VIN',mileage:25,salePrice:1000,agencyName:'Agence'},identity,active),await renderRepairOrderDocument({agency_id:'1',order_number:'OR-1',created_at:'2026-09-27',status:'ready',customer_name:'Client',vehicle_label:'M X',vin:'VIN',mileage_in:25,complaint:'Bruit',diagnostics:[],interventions:[],items:[],financialSummary:{subtotal:0,discount:0,tax:0,total:0,currencyCode:'XAF'},qualityControls:[],warrantyDocumentContext:full},identity),await renderDeliveryDocumentData({agency_id:1,delivery_number:'PV-1',scheduled_at:'2026-10-01',delivered_at:'2026-10-01',customer_name:'Client',vehicle_label:'M X',vin:'VIN',mileage_at_delivery:25,checklist:[],documents:[],signatures:[],warrantyDocumentContext:active},identity)];
 for(const pdf of pdfs){assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.match(pdf.toString('latin1'),/\/MediaBox\s*\[0\s+0\s+595\.28\s+841\.89\]/);assert.ok(pdf.length>1800)}
});

test('WDC-26..31 utilise le snapshot contrat, garde reçu/planning neutres et privilégie la GED',async()=>{
 const context=await readFile(new URL('../src/modules/documents/warranty-document-context.ts',import.meta.url),'utf8'),commercial=await readFile(new URL('../src/modules/documents/commercial-document.ts',import.meta.url),'utf8'),billing=await readFile(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8'),delivery=await readFile(new URL('../src/modules/deliveries/delivery.routes.ts',import.meta.url),'utf8');
 assert.match(context,/provider_name_snapshot/);assert.match(context,/duration_months/);assert.doesNotMatch(context,/default_warranty_months|default_mileage_limit|is_active=TRUE/);
 assert.doesNotMatch(commercial.slice(commercial.indexOf('renderPaymentReceiptData'),commercial.indexOf('renderDeliveryDocumentData')),/renderWarrantyDocumentSections/);
 assert.doesNotMatch(commercial.slice(commercial.indexOf('renderDeliveryPlanningDocumentData')),/warrantyDocumentContext/);
 assert.match(billing,/historicalBusinessPdf\(`invoice:/);assert.match(delivery,/historicalBusinessPdf\(`delivery:/);
});
