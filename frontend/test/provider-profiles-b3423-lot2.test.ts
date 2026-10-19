import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const read=(file:string)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const page=read('src/modules/hr/HrAdministrationPage.tsx'),modal=read('src/modules/hr/ProviderProfileModal.tsx');
test('LOT2 ajoute les deux actions Personnel sans remplacer le parcours salarié',()=>{assert.match(page,/Nouvel employé/);assert.match(page,/Nouveau prestataire/);assert.match(page,/can\("hr\.providers\.manage"\)/);assert.match(page,/ProviderProfileModal/)});
test('LOT2 présente les formes physique et morale et le rattachement initial',()=>{assert.match(modal,/Personne physique/);assert.match(modal,/Personne morale/);assert.match(modal,/Agence initiale/);assert.match(modal,/Nature des services/);assert.match(modal,/Raison sociale/)});
test('LOT2 rend le rapprochement explicite et ne crée aucun compte',()=>{assert.match(modal,/Contrôle des doublons/);assert.match(modal,/selectedIdentityId/);assert.match(modal,/Salarié existant/);assert.match(modal,/identité distincte malgré une correspondance probable/);assert.match(modal,/Aucun compte ERP, contrat salarié ou rémunération n’est créé/)});
test('LOT2 couvre fiche, média et décisions motivées',()=>{assert.match(modal,/Dossier prestataire/);assert.match(modal,/Photo \/ logo privé/);assert.match(modal,/Suspendre/);assert.match(modal,/Réactiver/);assert.match(modal,/Motif obligatoire/);assert.doesNotMatch(modal,/window\.(?:alert|confirm|prompt)/)});
