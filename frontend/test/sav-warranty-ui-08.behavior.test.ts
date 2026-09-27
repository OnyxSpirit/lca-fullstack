import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const modal = readFileSync(new URL('../src/modules/service/NewRepairOrderModal.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../src/modules/service/WarrantyCard.tsx', import.meta.url), 'utf8');
const hooks = readFileSync(new URL('../src/api/erpHooks.ts', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/modules/service/RepairOrderDetailPage.tsx', import.meta.url), 'utf8');

test('UI08-FE-01 la sélection véhicule interroge automatiquement l’éligibilité', () => assert.match(modal, /useVehicleWarrantyEligibilityQuery\(formData\.vehicleId,parsedMileage,isOpen\)/));
test('UI08-FE-02 le nom et le code constructeur sont affichés', () => { assert.match(modal, /Constructeur[\s\S]*providerName/); assert.match(modal, /Code constructeur[\s\S]*providerCode/); });
test('UI08-FE-03 la limite NULL n’est jamais rendue à zéro', () => { assert.match(modal, /mileageLimit==null\?'Non renseignée'/); assert.doesNotMatch(modal, /mileageLimit\s*\?\?\s*0/); });
test('UI08-FE-04 dates, statut, durée et kilométrage de référence sont affichés', () => { for (const label of ['Statut contractuel', 'Durée contractuelle', 'Date d’activation', 'Date de début', 'Date d’échéance', 'Kilométrage de référence']) assert.match(modal, new RegExp(label)); });
test('UI08-FE-05 aucun sélecteur manuel constructeur ni checkbox garantie', () => { assert.doesNotMatch(modal, /<select[^>]*provider|warrantyIntent|type="checkbox"[^>]*garantie/i); });
test('UI08-FE-06 absence de contrat, expiration et limite dépassée sont distinctes', () => { for (const text of ['Aucune garantie constructeur applicable', 'Garantie expirée par date', 'Limite kilométrique dépassée']) assert.match(modal, new RegExp(text)); });
test('UI08-FE-07 chargement et erreur API sont distincts de l’absence de garantie', () => { assert.match(modal, /Vérification du contrat/); assert.match(modal, /warrantyQuery\.isError/); });
test('UI08-FE-08 le cache est isolé par véhicule et kilométrage', () => assert.match(hooks, /queryKey:\['vehicle-warranty-eligibility',vehicleId,mileage\]/));
test('UI08-FE-09 fermeture et remount désactivent puis reconstruisent la requête', () => { assert.match(hooks, /requestEnabled&&Boolean\(vehicleId\)/); assert.match(modal, /useVehicleWarrantyEligibilityQuery\(formData\.vehicleId,parsedMileage,isOpen\)/); });
test('UI08-FE-10 WarrantyCard affiche nom et code en lecture seule', () => { assert.match(card, /Constructeur<input[^>]*readOnly[^>]*providerName/); assert.match(card, /Code constructeur<input[^>]*readOnly[^>]*providerCode/); });
test('UI08-FE-11 seuls type, autorisation et commentaire sont éditables pour la décision', () => { assert.match(card, /Type de prise en charge<select/); assert.match(card, /value=\{authorization\} onChange/); assert.match(card, /value=\{comment\} onChange/); });
test('UI08-FE-12 FULL et PARTIAL restent disponibles', () => { assert.match(card, /value="FULL"/); assert.match(card, /value="PARTIAL"/); });
test('UI08-FE-13 code constructeur et autorisation restent distincts', () => assert.doesNotMatch(card, /authorization\s*[!=]==?\s*warranty\.providerCode/));
test('UI08-FE-14 UI-07 conserve canDecide et blockReason serveur', () => { assert.match(detail, /ro\.customerApproval\.canDecide/); assert.match(detail, /ro\.customerApproval\.blockReason/); });
