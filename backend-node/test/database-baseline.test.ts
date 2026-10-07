import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { FRESH_BASELINE_NAME, FRESH_BASELINE_VERSION, MINIMUM_MIGRATION_VERSION, classifyDatabase, consolidatedBaselineVersion, databasePath, futureMigrationNames, isConsolidatedBaselineName, shouldApplyMigration } from '../src/scripts/database-bootstrap.js';

const root=resolve(import.meta.dirname,'../..');
const read=(path:string)=>readFileSync(resolve(root,path),'utf8');
const baseline=read('backend-node/database/baseline/001_initial_schema.sql');
const seed=read('backend-node/database/seeds/001_system_seed.sql');
const seedAdmin=read('backend-node/src/scripts/seed-admin.ts')+read('backend-node/src/scripts/admin-provisioning.ts');
const laborRateProvisioning=read('backend-node/src/scripts/workshop-labor-rate-provisioning.ts');
const docker=read('docker-compose.yml');

function sourceFiles(directory:string):string[]{return readdirSync(directory).flatMap(name=>{const path=resolve(directory,name);return statSync(path).isDirectory()?sourceFiles(path):/\.tsx?$/.test(name)?[path]:[];});}
function codes(text:string){return new Set([...text.matchAll(/['"]([a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)+)['"]/g)].map(match=>match[1]));}

test('BASELINE-01 est unique, versionné 060 et non destructif',()=>{
  assert.equal(FRESH_BASELINE_VERSION,60);assert.equal(FRESH_BASELINE_NAME,'baseline_001_060');assert.equal(MINIMUM_MIGRATION_VERSION,33);assert.match(baseline,/CREATE TABLE schema_migrations/);assert.match(baseline,/VALUES \(60,'baseline_001_060'/);
  assert.doesNotMatch(baseline,/^\s*(DROP|DELETE|UPDATE|TRUNCATE)\b/im);
  const tables=[...baseline.matchAll(/CREATE TABLE\s+`?([a-z0-9_]+)`?/gi)].map(match=>match[1]);
  assert.equal(tables.length,new Set(tables).size);assert.ok(tables.length>=92);
});

test('BASELINE-02 représente les structures finales critiques',()=>{
  for(const token of ['refresh_tokens','customer_contacts','showroom_test_drives','delivery_status_history','workshop_session_history','part_stocks','purchase_order_receipts','document_sequences','uq_sales_quotation_id','uk_delivery_signature_final','uk_documents_source_key','event_key','parent_document_id','accumulated_pause_seconds'])assert.match(baseline,new RegExp(token));
  assert.match(baseline,/scope ENUM\('OWN','AGENCY','CONCESSION','GLOBAL'\)/);assert.match(baseline,/currency_code CHAR\(3\) NOT NULL DEFAULT 'XAF'/);
  for(const token of ['uk_intervention_request','uk_reservation_request','uk_repair_item_request','repair_order_estimate_items','uk_intervention_estimate_item','uk_reservation_estimate_item','uk_repair_item_estimate','consumed_quantity','payment_refunds','abandonment_reason_code','handover_type','workshop_labor_rates','rate_code_snapshot','rate_label_snapshot'])assert.match(baseline,new RegExp(token));
  for(const token of ['idx_notifications_user_visible','fk_notification_archived_by','fk_notification_deleted_by','internal_stock_categories','fk_internal_stock_item_category','budget_categories','fk_budget_category','fk_budget_expense_category','budget_fund_movements','chk_budget_fund_movement_positive','normalized_email','normalized_phone','uq_customer_agency_normalized_email','uq_customer_agency_normalized_phone'])assert.match(baseline,new RegExp(token));
});

test('BASELINE-03 le seed est système, idempotent et sans secret ni donnée métier',()=>{
  assert.match(seed,/ON DUPLICATE KEY UPDATE|INSERT IGNORE/);assert.doesNotMatch(seed,/ADMIN_PASSWORD|JWT_.*SECRET|password_hash/i);
  assert.doesNotMatch(seed,/INSERT\s+(?:IGNORE\s+)?INTO\s+(users|customers|leads|vehicles|sales|invoices|showroom_visits)\b/i);
  assert.match(seed,/SUPER_ADMIN.*TRUE,TRUE/s);assert.doesNotMatch(seed,/DIRECTOR|SALES_MANAGER|SALES_AGENT|RECEPTIONIST|SERVICE_MANAGER|SERVICE_ADVISOR|WORKSHOP_MANAGER|TECHNICIAN|PARTS_MANAGER|WAREHOUSE_CLERK|DELIVERY_MANAGER|ACCOUNTANT/);
  assert.equal((seed.match(/INSERT (?:IGNORE )?INTO role_permissions/g)??[]).length,1);
  assert.match(seed,/r.is_system=TRUE AND r.is_active=TRUE AND p.is_active=TRUE/);
});

test('BASELINE-04 toutes les permissions runtime littérales sont initialisées par seed ou migration future',()=>{
  const runtime=new Set<string>();
  for(const file of [...sourceFiles(resolve(root,'backend-node/src')),...sourceFiles(resolve(root,'frontend/src'))]){
    const text=readFileSync(file,'utf8');
    for(const match of text.matchAll(/(?:requirePermission|assertPermission|can|hasPermission|permissionScope)\(\s*['"]([a-z][a-z0-9_.-]+)['"]/g))runtime.add(match[1]!);
  }
  const futureMigrations=futureMigrationNames(readdirSync(resolve(root,'backend-node/database/migrations'))).filter(name=>Number(name.slice(0,3))>FRESH_BASELINE_VERSION).map(name=>read(`backend-node/database/migrations/${name}`)).join('\n');
  const initialized=codes(seed+futureMigrations);const missing=[...runtime].filter(code=>!initialized.has(code)).sort();assert.deepEqual(missing,[]);
});

test('BASELINE-04B le seed absorbe les permissions système 034–048 encore utilisées',()=>{
  const expected=['roles.delete','service.order.abandon','notifications.update','notifications.archive','notifications.delete','hr.budget.category.view','hr.budget.category.manage','service.warranty.manage','service.warranty.approve','settings.manufacturers.view','settings.manufacturers.create','settings.manufacturers.update','settings.manufacturers.disable'];
  for(const code of expected)assert.equal([...seed.matchAll(new RegExp(`['"]${code.replaceAll('.','\\.')}['"]`,'g'))].length,1,code);
});

test('BASELINE-05 détection fail-safe base neuve, versionnée et ambiguë',()=>{
  assert.equal(classifyDatabase([]),'EMPTY');assert.equal(classifyDatabase(['schema_migrations','users']),'VERSIONED');assert.equal(classifyDatabase(['users']),'AMBIGUOUS');
});

test('BASELINE-06 seules les migrations futures strictement supérieures à 033 sont exécutées',()=>{
  assert.deepEqual(futureMigrationNames(['033_ged.sql','034_next.sql','README.md','035_more.sql']),['034_next.sql','035_more.sql']);
  assert.match(read('backend-node/src/scripts/database-bootstrap.ts'),/DATABASE_VERSION_UNSUPPORTED/);
  assert.match(read('backend-node/src/scripts/database-bootstrap.ts'),/DUPLICATE_MIGRATION_VERSION/);
});

test('BASELINE-06B fresh saute 034–060 mais une base historique 046 conserve 047–060',()=>{
  for(let version=34;version<=60;version++)assert.equal(shouldApplyMigration(version,new Set([60]),60),false);
  assert.equal(shouldApplyMigration(47,new Set([46]),null),true);
  assert.equal(shouldApplyMigration(48,new Set([46]),null),true);
  assert.equal(shouldApplyMigration(49,new Set([46]),null),true);
  assert.equal(shouldApplyMigration(50,new Set([46]),null),true);
  assert.equal(shouldApplyMigration(40,new Set([39]),null),true);
  assert.equal(shouldApplyMigration(39,new Set([38]),null),true);
  assert.equal(shouldApplyMigration(34,new Set([33]),null),true);
});

test('BOOTSTRAP-10 la baseline 060 absorbe explicitement toutes les migrations 034–060',()=>{
  for(const token of ['warranty_available','default_warranty_months','default_mileage_limit','warranty_provider_id','vehicle_warranty_contracts'])assert.match(baseline,new RegExp(token));
  const migrationVersions=futureMigrationNames(readdirSync(resolve(root,'backend-node/database/migrations'))).map(name=>Number(name.slice(0,3)));
  assert.deepEqual(migrationVersions,Array.from({length:27},(_,index)=>index+34));
  for(const token of ['CREATE TABLE document_categories','CREATE TABLE document_types','document_type_id','idx_documents_category_type','fk_documents_type'])assert.match(baseline,new RegExp(token));
  for(const token of ['vehicle_locations','vehicle_location_id','from_vehicle_location_id','purchase_price_snapshot','total_cost_snapshot'])assert.match(baseline,new RegExp(token));
});

test('BOOT-01/02 fresh baseline_001_060 ne rejoue rien et reste idempotente',()=>{const applied=new Set([60]),baseline=consolidatedBaselineVersion([{version:60,name:'baseline_001_060'}]);for(let version=34;version<=60;version++)assert.equal(shouldApplyMigration(version,applied,baseline),false)});
test('BOOT-03 historique baseline 48 + 49 applique 050 à 058',()=>{const applied=new Set([48,49]),baseline=consolidatedBaselineVersion([{version:48,name:'baseline_001_048'},{version:49,name:'049_ged_centralized_repository.sql'}]);assert.deepEqual([34,35,48,49,50,51,52,53,54,55,56,57,58].filter(v=>shouldApplyMigration(v,applied,baseline)),[50,51,52,53,54,55,56,57,58])});
test('BOOT-04 ligne 034 redondante sous baseline 48 reste sans effet',()=>{const applied=new Set([34,48,49]),baseline=consolidatedBaselineVersion([{version:34,name:'034_role_deletion_permission.sql'},{version:48,name:'baseline_001_048'},{version:49,name:'049_ged_centralized_repository.sql'}]);assert.deepEqual([34,35,49,50,51,52,53,54,55,56].filter(v=>shouldApplyMigration(v,applied,baseline)),[50,51,52,53,54,55,56])});
test('BOOT-05 FAILED_PARTIAL 035 couvert ne rend pas 035 candidate',()=>assert.equal(shouldApplyMigration(35,new Set([34,48,49]),48),false));
test('BOOT-06 FAILED_PARTIAL 050 post-baseline reste une candidate bloquante',()=>assert.equal(shouldApplyMigration(50,new Set([48,49]),48),true));
test('BOOT-07 sans baseline les lignes individuelles gouvernent normalement',()=>{const applied=new Set([34]);assert.equal(shouldApplyMigration(34,applied,null),false);assert.equal(shouldApplyMigration(35,applied,null),true)});
test('BOOT-08 sans baseline FAILED_PARTIAL 035 reste une candidate bloquante',()=>assert.equal(shouldApplyMigration(35,new Set([34]),null),true));
test('BOOT-09 baseline 51 applique seulement 052',()=>{const applied=new Set([51]);assert.deepEqual([34,35,49,50,51,52].filter(v=>shouldApplyMigration(v,applied,51)),[52])});
test('BOOT-09B baseline 52 applique seulement 053',()=>{const applied=new Set([52]);assert.deepEqual([51,52,53].filter(v=>shouldApplyMigration(v,applied,52)),[53])});
test('BOOT-09C baseline 53 applique 054 à 056',()=>{const applied=new Set([53]);assert.deepEqual([52,53,54,55,56].filter(v=>shouldApplyMigration(v,applied,53)),[54,55,56])});
test('BOOT-09D baseline 55 applique seulement 056',()=>{const applied=new Set([55]);assert.deepEqual([54,55,56].filter(v=>shouldApplyMigration(v,applied,55)),[56])});
test('BOOT-10 baseline 60 tolère une trace individuelle redondante',()=>{const applied=new Set([34,60]);for(let version=34;version<=60;version++)assert.equal(shouldApplyMigration(version,applied,60),false)});

test('BOOTSTRAP-05/06/07 les protections checksum et DDL partielle restent actives',()=>{
  const runner=read('backend-node/src/scripts/mysql-migration-runner.ts'),bootstrap=read('backend-node/src/scripts/database-bootstrap.ts');
  assert.match(runner,/previous\.statement_checksum!==statementHash.*MIGRATION_CHECKSUM_MISMATCH/s);
  assert.match(runner,/previous\?\.status==='FAILED_PARTIAL'.*MIGRATION_FAILED_PARTIAL/s);
  assert.match(runner,/markFailed[\s\S]*MIGRATION_FAILED_PARTIAL/);
  assert.match(bootstrap,/String\(row\.checksum\)!==migrationChecksum\(sql\).*MIGRATION_CHECKSUM_MISMATCH/s);
  assert.equal(isConsolidatedBaselineName('baseline_001_046'),true);
  assert.equal(isConsolidatedBaselineName('047_warranty_manufacturer_lifecycle_foundation.sql'),false);
});

test('BASELINE-06C le provisioning T1–T4 est central, idempotent et raccordé à seed:admin',()=>{
  assert.match(seedAdmin,/provisionDefaultWorkshopLaborRates\(connection,\s*concession\.insertId\)/);
  for(const code of ['T1','T2','T3','T4'])assert.match(laborRateProvisioning,new RegExp(`code: '${code}'`));
  assert.match(laborRateProvisioning,/ON DUPLICATE KEY UPDATE id=id/);
  assert.doesNotMatch(laborRateProvisioning,/ON DUPLICATE KEY UPDATE[^\n]*(hourly_rate|label|is_active)/);
});

test('BASELINE-07 Docker initialise un volume vide avec baseline puis seed uniquement',()=>{
  assert.match(docker,/baseline\/001_initial_schema\.sql:\/docker-entrypoint-initdb\.d\/001-initial-schema\.sql/);assert.match(docker,/seeds\/001_system_seed\.sql:\/docker-entrypoint-initdb\.d\/002-system-seed\.sql/);
  assert.doesNotMatch(docker,/backend\/database\/schema\.sql:\/docker-entrypoint-initdb|backend\/database\/migrations\/0(?:0[1-9]|[12][0-9]|3[0-3]).*docker-entrypoint-initdb/);
  assert.match(docker,/database-bootstrap\.js && node dist\/server\.js/);
});

test('BASELINE-08 l’historique 001–033 reste traçable et la prochaine version est 034',()=>{
  const names=readdirSync(resolve(root,'backend-node/database/legacy-migrations')).filter(name=>/^\d{3}_.*\.sql$/.test(name));
  assert.deepEqual(names.map(name=>Number(name.slice(0,3))).sort((a,b)=>a-b),Array.from({length:33},(_,index)=>index+1));
  assert.equal(futureMigrationNames(names).length,0);
});

test('BASELINE-09 le baseline est l’unique source consolidée active',()=>{
  assert.equal(readdirSync(resolve(root,'backend-node/database')).includes('schema.sql'),false);
  assert.equal(readdirSync(resolve(root,'backend-node/database/legacy-migrations')).includes('all_migrations.sql'),false);
});

test('DB-UNIFY-01 aucune source active ne dépend de l’ancien backend Database',()=>{
  const forbidden=['backend','database'].join('/');
  for(const file of [...sourceFiles(resolve(root,'backend-node/src')),...sourceFiles(resolve(root,'backend-node/test'))]){
    if(file.endsWith('database-baseline.test.ts'))continue;
    assert.equal(readFileSync(file,'utf8').includes(forbidden),false,file);
  }
});
test('DB-UNIFY-02 baseline chargé depuis backend-node/database/baseline',()=>{assert.equal(databasePath('baseline/001_initial_schema.sql'),resolve(root,'backend-node/database/baseline/001_initial_schema.sql'));});
test('DB-UNIFY-03 seed chargé depuis backend-node/database/seeds',()=>{assert.equal(databasePath('seeds/001_system_seed.sql'),resolve(root,'backend-node/database/seeds/001_system_seed.sql'));});
test('DB-UNIFY-04 migrations futures chargées depuis backend-node/database/migrations',()=>{assert.equal(databasePath('migrations'),resolve(root,'backend-node/database/migrations'));});
test('DB-UNIFY-05 les migrations 001–033 ne sont jamais candidates au runner',()=>{assert.equal(futureMigrationNames(readdirSync(databasePath('legacy-migrations'))).length,0);});
test('DB-UNIFY-06 034 est reconnue comme prochaine migration',()=>{assert.deepEqual(futureMigrationNames(['033_last.sql','034_next.sql']),['034_next.sql']);});
test('DB-UNIFY-07 Docker utilise uniquement backend-node/database',()=>{assert.match(docker,/\.\/backend-node\/database/);assert.doesNotMatch(docker,/\.\/backend\/database/);});
test('DB-UNIFY-08 le backend Express ne dépend pas du dossier NestJS',()=>{assert.equal(readdirSync(root).includes('backend'),false);});
test('DB-UNIFY-09 la base ambiguë reste fail-safe',()=>{assert.equal(classifyDatabase(['customers']),'AMBIGUOUS');});
test('DB-UNIFY-10 baseline et seed restent sans secret ni donnée métier',()=>{assert.doesNotMatch(baseline+seed,/ADMIN_PASSWORD|JWT_ACCESS_SECRET|password_hash\s*[,)]/i);assert.doesNotMatch(seed,/INSERT\s+(?:IGNORE\s+)?INTO\s+(users|customers|leads|vehicles|sales|invoices)\b/i);});
