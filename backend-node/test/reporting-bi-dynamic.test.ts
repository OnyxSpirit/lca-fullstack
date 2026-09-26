import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../src/modules/reports/report.routes.ts',import.meta.url),'utf8');

test('REPORTING-01 tous les endpoints exigent reporting.view',()=>assert.equal((source.match(/requirePermission\('reporting\.view'\)/g)??[]).length,11));
test('REPORTING-02 export exige aussi reporting.export',()=>assert.match(source,/use\('\/reports\/export',requirePermission\('reporting\.export'\)\)/));
test('REPORTING-03 les sections sensibles exigent leur permission source',()=>{for(const code of ['billing.view','sales.view','vehicles.financials.view','workshop.productivity.view','parts.reporting.view'])assert.ok(source.includes(code),code)});
test('REPORTING-04 OWN collectif est explicitement refusé',()=>assert.match(source,/scope OWN ne s’applique pas aux agrégats Reporting collectifs/));
test('REPORTING-05 AGENCY refuse une agence client différente',()=>assert.match(source,/level==='AGENCY'.*agencyId!==actorAgencyId/));
test('REPORTING-06 CONCESSION résout les agences depuis MySQL',()=>assert.match(source,/actor\.concession_id=target\.concession_id/));
test('REPORTING-07 la consolidation CONCESSION utilise une sous-requête bornée',()=>assert.match(source,/report_agency\.concession_id=\(SELECT actor_agency\.concession_id/));
test('REPORTING-07b avoirs et paiements réutilisent aussi le scope consolidé',()=>{assert.match(source,/cs=scope\('ci',f\),ps=scope\('pi',f\)/);assert.match(source,/\$\{cs\.sql\}/);assert.match(source,/\$\{ps\.sql\}/)});
test('REPORTING-08 GLOBAL reste le scope de Reporting',()=>assert.match(source,/f\.scope==='GLOBAL'/));
test('REPORTING-09 comparaison agences refuse AGENCY mais accepte la policy CONCESSION',()=>{assert.match(source,/f\.scope==='AGENCY'/);assert.match(source,/agencyScope=scope\('a',f,'id'\)/)});
test('REPORTING-10 export réutilise la matrice de section et le même filtre',()=>{assert.match(source,/await requireSection\(r,section as keyof typeof sectionPermissions\)/);assert.match(source,/const f=await filters\(r,section as keyof typeof sectionPermissions,true\)/)});
test('REPORTING-17 le périmètre d’une section est borné par ses permissions source',()=>{assert.match(source,/for\(const code of \[\.\.\.sectionPermissions\[section\]/);assert.match(source,/rank\[sourceScope\]<rank\[level\]/)});
test('REPORTING-18 stock VN et VO compte les véhicules présents',()=>{assert.match(source,/SUM\(v.vehicle_type='new'\) vn_stock/);assert.match(source,/SUM\(v.vehicle_type='used'\) vo_stock/)});
test('REPORTING-11 période et granularité sont validées',()=>{assert.match(source,/if\(from>to\)/);assert.match(source,/\['day','week','month'\]\.includes/);assert.match(source,/WEEKDAY/)});
test('REPORTING-12 la période précédente conserve le même nombre de jours',()=>{assert.match(source,/days=Math\.round/);assert.match(source,/previousStart\.setUTCDate\(previousStart\.getUTCDate\(\)-days\+1\)/)});
test('REPORTING-13 zéro ne produit ni Infinity ni faux pourcentage',()=>{assert.match(source,/previous===0\?null/);for(const token of ['salesRevenueHt?','planned?','worked?','net?'])assert.ok(source.includes(token),token)});
test('REPORTING-14 ventes multi-lignes ne multiplient plus les montants de vente',()=>{assert.doesNotMatch(source,/FROM sales s JOIN sale_items si ON si\.sale_id=s\.id AND si\.vehicle_id IS NOT NULL/);assert.match(source,/FROM sales s LEFT JOIN financing/);assert.match(source,/ROUND\(vsi\.line_total\/\(1\+CASE WHEN s\.tax_mode='TAXABLE'/)});
test('REPORTING-15 Parts agrège part_stocks par agence',()=>{assert.match(source,/FROM part_stocks ps JOIN parts p/);assert.match(source,/ps\.current_stock-ps\.reserved_stock/)});
test('REPORTING-16 aucun rôle historique ne gouverne Reporting',()=>assert.doesNotMatch(source,/DIRECTOR|DIRECTION|ACCOUNTANT|MANAGER|role\.code|hasRole|authorize\(/));
