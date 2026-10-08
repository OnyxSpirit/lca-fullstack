import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const dashboard=read('src/modules/dashboard/dashboard.routes.ts');
const reporting=read('src/modules/reports/report.routes.ts');
const sales=read('src/modules/sales/sale.service.ts');
const quotations=read('src/modules/quotations/quotation.service.ts');
const workshop=read('src/modules/workshop/workshop.routes.ts');
const documents=read('src/modules/documents/document-access.ts');
const vehicles=read('src/modules/vehicles/vehicle.routes.ts');

test('LOT14A-A recherche globale et dashboard excluent seulement le stock véhicule archivé',()=>{
  const overview=dashboard.slice(dashboard.indexOf("dashboardRouter.get('/dashboard/overview'"),dashboard.indexOf("dashboardRouter.get('/global-search'"));
  const search=dashboard.slice(dashboard.indexOf("dashboardRouter.get('/global-search'"));
  assert.match(overview,/FROM vehicles v WHERE v\.archived_at IS NULL AND/);
  assert.match(overview,/v\.archived_at IS NULL AND v\.status IN\('received','preparation','available','reserved'\)/);
  assert.match(search,/FROM vehicles v JOIN versions[\s\S]*WHERE v\.archived_at IS NULL AND \$\{vehicles\.sql\}/);
  assert.match(search,/\['repair_order'[\s\S]*FROM repair_orders ro JOIN vehicles v[\s\S]*WHERE %S/);
  assert.doesNotMatch(search,/FROM repair_orders ro JOIN vehicles v[^`]*archived_at/);
});

test('LOT14A-B reporting et export filtrent le stock courant mais préservent les ventes historiques',()=>{
  const currentStock=reporting.match(/FROM vehicles v WHERE v\.archived_at IS NULL AND v\.status IN\('received','preparation','available','reserved'\)/g)??[];
  assert.equal(currentStock.length,3,'résumé, vieillissement et export stock doivent partager le filtre');
  const vehicleReport=reporting.slice(reporting.indexOf("reportRouter.get('/reports/vehicles'"),reporting.indexOf("reportRouter.get('/reports/agencies'"));
  assert.match(vehicleReport,/FROM sales s JOIN sale_items si ON si\.sale_id=s\.id JOIN vehicles v ON v\.id=si\.vehicle_id WHERE DATE\(s\.sold_at\)/);
  assert.doesNotMatch(vehicleReport,/JOIN vehicles v ON v\.id=si\.vehicle_id WHERE v\.archived_at/);
});

test('LOT14A-C vente et devis refusent une archive sous verrou avant toute création',()=>{
  for(const [source,message] of [[sales,'ne peut plus être vendu'],[quotations,'ne peut plus être utilisé pour un nouveau devis']] as const){
    assert.match(source,/SELECT id,agency_id,status,archived_at,[^']+ FROM vehicles WHERE id=\? FOR UPDATE/);
    assert.match(source,new RegExp(`if\\(vehicle\\.archived_at!=null\\)throw new HttpError\\(409,'Ce véhicule est archivé et ${message}'\\)`));
    const guard=source.indexOf('if(vehicle.archived_at!=null)');
    const firstBusinessInsert=Math.min(...['INSERT INTO sales','INSERT INTO sale_items','INSERT INTO quotations','INSERT INTO quotation_items'].map(token=>{const index=source.indexOf(token,guard);return index<0?Number.POSITIVE_INFINITY:index}));
    assert.ok(guard>=0&&guard<firstBusinessInsert,'le refus doit précéder toute écriture commerciale');
  }
});

test('LOT14A-D Stock conserve son filtre et les modules OR, GED et images restent historiquement ouverts',()=>{
  assert.match(vehicles,/clauses=\[scoped\.sql,'v\.archived_at IS NULL'\]/);
  const customerVehicles=workshop.slice(workshop.indexOf("workshopRouter.get('/repair-orders/customer-vehicles'"),workshop.indexOf("workshopRouter.get('/repair-orders/vehicles/"));
  assert.match(customerVehicles,/EXISTS\(SELECT 1 FROM sale_items/);
  assert.doesNotMatch(customerVehicles,/archived_at/);
  assert.match(documents,/vehicle:\{sql:`SELECT v\.id/);
  assert.doesNotMatch(documents,/vehicle:\{sql:[^}]*archived_at/);
  assert.doesNotMatch(vehicles,/images\/order|vehicles\.archive|vehicles:archived/);
});
