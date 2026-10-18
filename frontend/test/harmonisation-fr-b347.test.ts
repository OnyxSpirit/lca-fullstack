import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{activityStatusLabel,activityTypeLabel,quotationStatusLabel,testDriveStatusLabel}from'../src/lib/userFacingLabels';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('B347-NAV conserve le contrat de navigation et francise le tableau de bord',()=>{
 const sidebar=read('src/components/layout/Sidebar.tsx');
 assert.match(sidebar,/to: ROUTES\.dashboard/);
 assert.match(sidebar,/label: 'Tableau de bord général'/);
 assert.match(sidebar,/module: 'dashboard'/);
 assert.doesNotMatch(sidebar,/Dashboard Général/);
});

test('B347-CRM présente les types et statuts connus sans modifier leurs codes',()=>{
 assert.equal(activityTypeLabel('call'),'Appel téléphonique');
 assert.equal(activityTypeLabel('test_drive'),'Essai routier');
 assert.equal(activityStatusLabel('pending'),'En attente');
 assert.equal(activityStatusLabel('completed'),'Terminée');
 assert.equal(quotationStatusLabel('draft'),'Brouillon');
 assert.equal(quotationStatusLabel('negotiation'),'En négociation');
 const crm=read('src/modules/crm/CrmPage.tsx');
 assert.match(crm,/activityTypeLabel\(activity\.type\)/);
 assert.match(crm,/activityStatusLabel\(activity\.status\)/);
 assert.match(crm,/quotationStatusLabel\(quotation\.status\)/);
 assert.match(crm,/quotation\.status==='draft'/);
 const customer=read('src/modules/customers/CustomerDetailPage.tsx');
 assert.match(customer,/quotationStatusLabel\(quotation\.status\)/);
});

test('B347-SHOWROOM francise le mode tableau et tous les statuts d’essai connus',()=>{
 assert.equal(testDriveStatusLabel('planned'),'Planifié');
 assert.equal(testDriveStatusLabel('in_progress'),'En cours');
 assert.equal(testDriveStatusLabel('completed'),'Terminé');
 assert.equal(testDriveStatusLabel('cancelled'),'Annulé');
 const showroom=read('src/modules/showroom/ShowroomPage.tsx');
 assert.match(showroom,/>Tableau<\/Button>/);
 assert.match(showroom,/testDriveStatusLabel\(item\.status\)/);
 assert.match(showroom,/item\.status==='planned'&&canManageTestDrive/);
});

test('B347-INCONNU rend les valeurs inconnues explicites et traçables',()=>{
 assert.equal(activityTypeLabel('satellite'),'Type d’activité non reconnu (satellite)');
 assert.equal(activityStatusLabel('UNKNOWN'),'Statut d’activité non reconnu (UNKNOWN)');
 assert.equal(quotationStatusLabel(''),'Statut du devis non renseigné');
 assert.equal(testDriveStatusLabel(null),'Statut de l’essai non renseigné');
});

test('B347-GED conserve le libellé Aperçu et le gestionnaire existant',()=>{
 const ged=read('src/modules/documents/DocumentsGedPage.tsx');
 assert.match(ged,/>\s*Aperçu\s*</);
 assert.match(ged,/setPreview\(d\)/);
 assert.doesNotMatch(ged,/>Visionner</);
});

test('B347-ABRÉVIATIONS développe le chiffre d’affaires dans les vues prioritaires',()=>{
 assert.match(read('src/modules/billing/BillingPage.tsx'),/Chiffre d’affaires facturé/);
 assert.match(read('src/modules/dashboard/DashboardPage.tsx'),/Évolution hebdomadaire du chiffre d’affaires/);
 const reports=read('src/modules/reports/ReportsPage.tsx');
 assert.match(reports,/Chiffre d’affaires SAV net facturé/);
 assert.match(reports,/Chiffre d’affaires net facturé/);
});
