import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { BASELINE_VERSION, classifyDatabase, databasePath, futureMigrationNames } from '../src/scripts/database-bootstrap.js';

const root=resolve(import.meta.dirname,'../..');
const read=(path:string)=>readFileSync(resolve(root,path),'utf8');
const baseline=read('backend-node/database/baseline/001_initial_schema.sql');
const seed=read('backend-node/database/seeds/001_system_seed.sql');
const docker=read('docker-compose.yml');

function sourceFiles(directory:string):string[]{return readdirSync(directory).flatMap(name=>{const path=resolve(directory,name);return statSync(path).isDirectory()?sourceFiles(path):/\.tsx?$/.test(name)?[path]:[];});}
function codes(text:string){return new Set([...text.matchAll(/['"]([a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+)+)['"]/g)].map(match=>match[1]));}

test('BASELINE-01 est unique, versionné 033 et non destructif',()=>{
  assert.equal(BASELINE_VERSION,33);assert.match(baseline,/CREATE TABLE schema_migrations/);assert.match(baseline,/VALUES \(33,'baseline_001_033'/);
  assert.doesNotMatch(baseline,/^\s*(DROP|DELETE|UPDATE|TRUNCATE)\b/im);
  const tables=[...baseline.matchAll(/CREATE TABLE\s+`?([a-z0-9_]+)`?/gi)].map(match=>match[1]);
  assert.equal(tables.length,new Set(tables).size);assert.ok(tables.length>=80);
});

test('BASELINE-02 représente les structures finales critiques',()=>{
  for(const token of ['refresh_tokens','customer_contacts','showroom_test_drives','delivery_status_history','workshop_session_history','part_stocks','purchase_order_receipts','document_sequences','uq_sales_quotation_id','uk_delivery_signature_final','uk_documents_source_key','event_key','parent_document_id','accumulated_pause_seconds'])assert.match(baseline,new RegExp(token));
  assert.match(baseline,/scope ENUM\('OWN','AGENCY','CONCESSION','GLOBAL'\)/);assert.match(baseline,/currency_code CHAR\(3\) NOT NULL DEFAULT 'XAF'/);
});

test('BASELINE-03 le seed est système, idempotent et sans secret ni donnée métier',()=>{
  assert.match(seed,/ON DUPLICATE KEY UPDATE|INSERT IGNORE/);assert.doesNotMatch(seed,/ADMIN_PASSWORD|JWT_.*SECRET|password_hash/i);
  assert.doesNotMatch(seed,/INSERT\s+(?:IGNORE\s+)?INTO\s+(users|customers|leads|vehicles|sales|invoices|showroom_visits)\b/i);
  assert.match(seed,/SUPER_ADMIN.*TRUE,TRUE/s);assert.doesNotMatch(seed,/DIRECTOR|SALES_MANAGER|SALES_AGENT|RECEPTIONIST|SERVICE_MANAGER|SERVICE_ADVISOR|WORKSHOP_MANAGER|TECHNICIAN|PARTS_MANAGER|WAREHOUSE_CLERK|DELIVERY_MANAGER|ACCOUNTANT/);
  assert.equal((seed.match(/INSERT (?:IGNORE )?INTO role_permissions/g)??[]).length,1);
  assert.match(seed,/r.is_system=TRUE AND r.is_active=TRUE AND p.is_active=TRUE/);
});

test('BASELINE-04 toutes les permissions runtime littérales sont initialisées',()=>{
  const runtime=new Set<string>();
  for(const file of [...sourceFiles(resolve(root,'backend-node/src')),...sourceFiles(resolve(root,'frontend/src'))]){
    const text=readFileSync(file,'utf8');
    for(const match of text.matchAll(/(?:requirePermission|assertPermission|can|hasPermission|permissionScope)\(\s*['"]([a-z][a-z0-9_.-]+)['"]/g))runtime.add(match[1]!);
  }
  const initialized=codes(seed);const missing=[...runtime].filter(code=>!initialized.has(code)).sort();assert.deepEqual(missing,[]);
});

test('BASELINE-05 détection fail-safe base neuve, versionnée et ambiguë',()=>{
  assert.equal(classifyDatabase([]),'EMPTY');assert.equal(classifyDatabase(['schema_migrations','users']),'VERSIONED');assert.equal(classifyDatabase(['users']),'AMBIGUOUS');
});

test('BASELINE-06 seules les migrations futures strictement supérieures à 033 sont exécutées',()=>{
  assert.deepEqual(futureMigrationNames(['033_ged.sql','034_next.sql','README.md','035_more.sql']),['034_next.sql','035_more.sql']);
  assert.match(read('backend-node/src/scripts/database-bootstrap.ts'),/DATABASE_VERSION_UNSUPPORTED/);
  assert.match(read('backend-node/src/scripts/database-bootstrap.ts'),/DUPLICATE_MIGRATION_VERSION/);
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
