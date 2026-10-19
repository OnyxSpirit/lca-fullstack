import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const read=(file:string)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),table=read('src/modules/hr/UnifiedPersonnelTable.tsx'),page=read('src/modules/hr/HrAdministrationPage.tsx'),provider=read('src/modules/hr/ProviderProfileModal.tsx');
test('LOT3 remplace la liste Personnel par une pagination serveur unifiée',()=>{assert.match(page,/UnifiedPersonnelTable/);assert.match(table,/\/hr\/personnel\?/);assert.match(table,/pageSize/);assert.match(table,/totalPages/);assert.doesNotMatch(table,/\.concat\(|\[\.\.\./)});
test('LOT3 affiche les trois catégories une seule fois par identité',()=>{assert.match(table,/key=\{x\.identityId\}/);assert.match(table,/Salarié et prestataire/);assert.match(table,/\?'Prestataire':'Salarié'/)});
test('LOT3 conserve les fiches distinctes et filtre catégorie agence recherche',()=>{assert.match(table,/Fiche salarié/);assert.match(table,/Fiche prestataire/);assert.match(table,/Toutes les catégories/);assert.match(table,/Toutes les agences autorisées/);assert.match(table,/Rechercher une personne, société ou code/)});
test('LOT3 expose les rattachements et masque les mutations sans manage',()=>{assert.match(provider,/Rattachements agences/);assert.match(provider,/Ajouter une agence autorisée/);assert.match(provider,/assignmentDecision/);assert.match(provider,/canManage&&/);assert.match(provider,/hr\.providers\.manage/)});
