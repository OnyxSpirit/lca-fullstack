import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('AUTO-CODE-UI-01..07 retire les saisies manuelles des référentiels demandés',()=>{
 assert.doesNotMatch(source('src/modules/settings/DocumentReferencesSettings.tsx'),/aria-label="Code (de la catégorie|du type)"/);
 assert.doesNotMatch(source('src/modules/settings/ManufacturersSettings.tsx'),/>Code interne<input/);
 assert.doesNotMatch(source('src/modules/settings/DeliveryServicesSettings.tsx'),/>Code<input required/);
 assert.doesNotMatch(source('src/modules/deliveries/DeliveryChecklistTemplates.tsx'),/placeholder="Code stable"/);
 assert.doesNotMatch(source('src/modules/settings/OperationalResourcesSettings.tsx'),/\["code", "Code"\]/);
});

test('SETTINGS-WORKSHOP-01..05 masque les ressources et pagine les barèmes',()=>{
 const page=source('src/modules/settings/SettingsPage.tsx'),rates=source('src/modules/settings/WorkshopLaborRatesSettings.tsx'),resources=source('src/modules/settings/OperationalResourcesSettings.tsx');
 assert.doesNotMatch(page,/BaysSettings/);
 assert.match(resources,/export const BaysSettings/);
 assert.match(rates,/useClientPagination/);
 assert.match(rates,/Rechercher un barème horaire/);
 assert.match(rates,/page\.controls/);
});

test('SETTINGS-MARKS-01..06 sépare les onglets et leurs chargements',()=>{
 const marks=source('src/modules/settings/DocumentMarksSettings.tsx');
 assert.match(marks,/role="tablist"/);
 assert.match(marks,/>Signatures<\/Button>/);
 assert.match(marks,/>Cachets<\/Button>/);
 assert.match(marks,/useMySignature\(canViewSig&&\(personalOnly\|\|markTab==='signatures'\)\)/);
 assert.match(marks,/useServiceStamps\(canViewStamp&&markTab==='stamps'\)/);
});
