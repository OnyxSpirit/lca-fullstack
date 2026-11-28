import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const crm=fs.readFileSync(new URL('../src/modules/crm/CrmPage.tsx',import.meta.url),'utf8');
const stock=fs.readFileSync(new URL('../src/modules/vehicles/VehiclesListPage.tsx',import.meta.url),'utf8');
const catalog=fs.readFileSync(new URL('../src/modules/vehicles/CommercialCatalogPage.tsx',import.meta.url),'utf8');
const proformas=fs.readFileSync(new URL('../src/modules/proformas/ProformasPage.tsx',import.meta.url),'utf8');

test('EVO-01/02 CRM crée directement une pro forma',()=>{assert.doesNotMatch(crm,/Créer un devis/);assert.match(crm,/Créer une pro forma/);assert.match(crm,/\/proformas\?opportunityId=/);assert.match(proformas,/initialOpportunityId/)});
test('EVO-03 retire prix min, prix max et date entrée de l’interface Stock',()=>{assert.doesNotMatch(stock,/aria-label="Prix minimum"/);assert.doesNotMatch(stock,/aria-label="Prix maximum"/);assert.doesNotMatch(stock,/Date d’entrée —/)});
test('EVO-04..09 tableau paginé et actions de commande ciblées',()=>{assert.match(catalog,/Modèles sur commande/);assert.match(catalog,/ServerPagination/);assert.match(catalog,/Quantité \*/);assert.match(catalog,/Réceptionner/);assert.match(catalog,/actions\.receive\.isPending/)});
test('EVO-10 Démonstration apparaît dans les sélecteurs existants',()=>{assert.match(stock,/value="DEMONSTRATION">Démonstration/)});
test('EVO-11 Tous les statuts utilise une valeur vide et réinitialise la page',()=>{assert.match(proformas,/<option value="">Tous les statuts<\/option>/);assert.match(proformas,/setStatus\(e\.target\.value\);setPage\(1\)/)});
