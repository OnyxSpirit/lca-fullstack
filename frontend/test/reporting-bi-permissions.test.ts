import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const page=readFileSync(new URL('../src/modules/reports/ReportsPage.tsx',import.meta.url),'utf8');
const hooks=readFileSync(new URL('../src/api/reportHooks.ts',import.meta.url),'utf8');

test('REPORTING-FE-01 le module et chaque query sont conditionnés par permissions',()=>{for(const flag of ['reportAccess','overviewAccess','salesAccess','vehicleAccess','workshopAccess','partsAccess','financeAccess'])assert.ok(page.includes(flag),flag);assert.match(hooks,/enabled:enabled\(\)&&active/)});
test('REPORTING-FE-02 la matrice frontend reprend les permissions backend',()=>{for(const code of ['reporting.view','reporting.export','billing.view','sales.view','vehicles.financials.view','workshop.productivity.view','parts.reporting.view'])assert.ok(page.includes(code),code)});
test('REPORTING-FE-03 CONCESSION et GLOBAL permettent sélection et consolidation',()=>{assert.match(page,/reportScope==='CONCESSION'\|\|reportScope==='GLOBAL'/);assert.match(page,/<option value="">Consolidé<\/option>/)});
test('REPORTING-FE-04 AGENCY conserve son agence sans sélecteur',()=>assert.match(page,/agencyId:canSelectAgency\?selectedAgency\|\|undefined:auth\.currentAgency\?\.id/));
test('REPORTING-FE-05 le sélecteur utilise exclusivement les agences renvoyées par Reporting',()=>{assert.match(page,/\(agencies\.data\?\?\[\]\)\.map/);assert.doesNotMatch(page,/auth\.allAgencies\.map/)});
test('REPORTING-FE-06 export overview est masqué sans toutes ses permissions',()=>{assert.match(page,/exportOverview=overviewAccess&&auth\.can\('reporting\.export'\)/);assert.match(page,/\{exportOverview&&<Button/)});
test('REPORTING-FE-07 aucune donnée de rôle historique ne gouverne la page',()=>assert.doesNotMatch(page,/DIRECTOR|DIRECTION|ACCOUNTANT|MANAGER|roles\.includes|hasRole/));
test('REPORTING-FE-08 empty states et deltas restent neutres',()=>{assert.match(page,/\?'Comparaison indisponible'/);assert.match(page,/v\?\?'\u2014'/);assert.match(page,/v==null\?'\u2014'/)});
test('REPORTING-FE-09 le filtre d’agence utilise le paramètre propre à Reporting',()=>{assert.match(hooks,/p\.set\('reportAgencyId',f\.agencyId\)/);assert.match(page,/p\.set\('reportAgencyId',filters\.agencyId\)/)});
test('REPORTING-FE-10 la présentation monétaire et les graphiques sont francisés',()=>{assert.match(page,/new Intl\.NumberFormat\('fr-FR'/);assert.match(page,/Aucune donnée pour cette période/);assert.match(page,/name="Facturation nette TTC"/);assert.doesNotMatch(page,/Business Intelligence Concession|sold_at|Export CSV/)});
test('REPORTING-FE-11 les noms de fichier indiquent le rapport et le relevé de stock actuel',()=>{assert.match(page,/reporting-\$\{/);assert.match(page,/stock-actuel/)});
