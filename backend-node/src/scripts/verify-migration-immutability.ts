import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

type Policy={referenceCommit:string;referenceMaximumVersion:number;recoveryExceptions:Record<string,{sha256:string;sourceGitBlob:string;reason:string}>};
const root=resolve(import.meta.dirname,'../..'),repositoryRoot=resolve(root,'..'),database=resolve(root,'database'),migrations=resolve(database,'migrations');
const policy=JSON.parse(await readFile(resolve(database,'migration-immutability.json'),'utf8')) as Policy;
const names=(await readdir(migrations)).filter(name=>/^\d{3}_.+\.sql$/.test(name)).sort();
const versions=names.map(name=>Number(name.slice(0,3))),duplicates=versions.filter((version,index)=>versions.indexOf(version)!==index);
if(duplicates.length)throw new Error(`DUPLICATE_MIGRATION_VERSION: ${[...new Set(duplicates)].join(', ')}`);
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
for(const name of names){
  const version=Number(name.slice(0,3)),current=await readFile(resolve(migrations,name));
  if(version<=policy.referenceMaximumVersion){
    let historical:Buffer;
    try{historical=execFileSync('git',['show',`${policy.referenceCommit}:backend-node/database/migrations/${name}`],{cwd:repositoryRoot})}
    catch(error){throw new Error(`MIGRATION_REFERENCE_MISSING: ${name} absent de ${policy.referenceCommit} (${error instanceof Error?error.message:'erreur Git'})`)}
    if(sha(current)!==sha(historical))throw new Error(`MIGRATION_IMMUTABILITY_VIOLATION: ${name} diffère de ${policy.referenceCommit}`);
  }
  const exception=policy.recoveryExceptions[name];
  if(exception&&sha(current)!==exception.sha256)throw new Error(`MIGRATION_RECOVERY_ARTIFACT_MISMATCH: ${name}`);
}
console.log(`Migrations vérifiées: ${names.length}; référence immuable ${policy.referenceCommit} jusqu'à ${policy.referenceMaximumVersion}; ${Object.keys(policy.recoveryExceptions).length} exception de récupération documentée.`);
