import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('ESSAI-01/02/03 l’action reste disponible hors états terminaux et passe par le workflow dédié',()=>{const page=read('../src/modules/crm/CrmPage.tsx');assert.match(page,/selectedLead\.stage!==['"]GAGNE['"]&&selectedLead\.stage!==['"]PERDU['"]/);assert.match(page,/setTestDriveLead\(selectedLead\)/);assert.doesNotMatch(page,/disabled=\{!selectedLead\.canStartTestDrive\}/)});
test('ESSAI-04/05 le clic ouvre le workflow dédié et préremplit le contexte connu',()=>{const page=read('../src/modules/crm/CrmPage.tsx'),modal=read('../src/modules/crm/CrmTestDriveModal.tsx');assert.match(page,/setTestDriveLead\(selectedLead\)/);assert.match(modal,/lead\.id/);assert.match(modal,/lead\.assignedToName/);assert.match(modal,/currentAgency\?\.id/)});
test('ESSAI-06/07/08 sélectionne un véhicule disponible puis invalide CRM, Showroom et stock',()=>{const modal=read('../src/modules/crm/CrmTestDriveModal.tsx'),hooks=read('../src/api/erpHooks.ts');assert.match(modal,/status:'available'/);assert.match(hooks,/showroom\/crm\/leads\/\$\{leadId\}\/test-drives/);for(const value of ['erpKeys.leads','erpKeys.vehicles',"queryKey:['showroom']"])assert.match(hooks,new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))});
test('DEVIS frontend transmet les lignes multivéhicules, rend le succès et expose le message backend',()=>{const modal=read('../src/modules/crm/QuotationModal.tsx');assert.match(modal,/create\.mutateAsync\(\{opportunityId:lead\.opportunityId,items,clientRequestId/);assert.match(modal,/onCreated\(quotation\)/);assert.match(modal,/error instanceof Error\?error\.message/)});
