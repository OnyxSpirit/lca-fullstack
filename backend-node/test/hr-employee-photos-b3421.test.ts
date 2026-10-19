import assert from'node:assert/strict';
import{mkdtemp,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import path from'node:path';
import{readFileSync}from'node:fs';
import test from'node:test';
import{readEmployeePhoto,removeEmployeePhoto,saveEmployeePhoto}from'../src/modules/hr/hr-employee-photo.js';

const source=(file:string)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);

test('B3421 stockage privé valide le contenu, génère le nom et supprime uniquement son fichier',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'lca-hr-photo-')),before=process.env.UPLOAD_DIR;process.env.UPLOAD_DIR=directory;
 try{const stored=await saveEmployeePhoto({originalName:'../../photo.png',mimeType:'image/png',buffer:png});assert.match(stored,/^hr-employee-photo:[0-9a-f-]{36}\.png$/);const loaded=await readEmployeePhoto(stored);assert.equal(loaded.mime,'image/png');assert.deepEqual(loaded.buffer,png);await removeEmployeePhoto(stored);await assert.rejects(()=>readEmployeePhoto(stored),/Photographie introuvable/);await removeEmployeePhoto('/uploads/avatars/shared.png')}finally{if(before===undefined)delete process.env.UPLOAD_DIR;else process.env.UPLOAD_DIR=before;await rm(directory,{recursive:true,force:true})}
});

test('B3421 refuse format, contenu falsifié et dépassement de taille',async()=>{
 await assert.rejects(()=>saveEmployeePhoto({originalName:'x.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')}),/Format invalide/);
 await assert.rejects(()=>saveEmployeePhoto({originalName:'x.png',mimeType:'image/png',buffer:Buffer.from('not an image')}),/contenu du fichier/);
 await assert.rejects(()=>saveEmployeePhoto({originalName:'x.png',mimeType:'image/png',buffer:Buffer.alloc(3*1024*1024+1)}),/trop volumineuse/);
});

test('B3421 migration additive sans backfill et routes permissionnées/scopées',()=>{
 const migration=source('database/migrations/096_hr_employee_photos.sql'),routes=source('src/modules/hr/hr.routes.ts');
 assert.match(migration,/ADD COLUMN photo_path VARCHAR\(255\) NULL/);assert.doesNotMatch(migration,/UPDATE employee_profiles|DELETE|DROP/i);
 assert.match(routes,/"\/hr\/employees\/:id\/photo"[\s\S]*requirePermission\("hr\.employees\.view"\)/);
 assert.match(routes,/"\/hr\/employees\/:id\/photo"[\s\S]*requirePermission\("hr\.employees\.manage"\)/);
 assert.match(routes,/current\.user_id!=null[\s\S]*gérée depuis son profil utilisateur/);
 assert.match(routes,/CASE WHEN ep\.user_id IS NOT NULL THEN u\.avatar_path ELSE ep\.photo_path END avatar_path/);
 assert.match(routes,/catch\(error\)\{await removeEmployeePhoto\(next\);throw error\}/);
});

test('B3421 préserve avatar ERP, photo RH historique à la liaison et absence de doublon',()=>{
 const routes=source('src/modules/hr/hr.routes.ts');
 assert.match(routes,/UPDATE employee_profiles SET user_id=\?,updated_by=\? WHERE id=\?/);
 assert.doesNotMatch(routes,/UPDATE employee_profiles SET user_id=\?,photo_path=NULL/);
 assert.match(routes,/SELECT id FROM employee_profiles WHERE user_id=\? FOR UPDATE/);
 assert.match(routes,/current\.user_id!=null&&current\.avatar_path\?\.startsWith\("\/uploads\/avatars\/"\)/);
});

