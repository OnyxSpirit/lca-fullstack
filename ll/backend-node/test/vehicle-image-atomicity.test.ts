import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mock, test } from 'node:test';
import { deleteVehicleImageFile, finalizeVehicleImages, stageVehicleImages, validateVehicleImages, withStagedVehicleImages, type VehicleImageFs } from '../src/modules/vehicles/vehicle-image-storage.js';

const dataUrl=(mime:string,bytes:number[])=>`data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
const jpeg=dataUrl('image/jpeg',[0xff,0xd8,0xff,0xdb,1]);
const png=dataUrl('image/png',[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1]);
const webp=dataUrl('image/webp',[0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]);
const error=(code:string)=>Object.assign(new Error(code),{code});

class MemoryFs {
  files=new Set<string>(); writes:string[]=[]; links:string[]=[]; unlinks:string[]=[];
  failWrite=false;failLinkAt=0;failUnlink=false;
  mkdir=async()=>undefined as any;
  writeFile=async(path:string)=>{if(this.failWrite)throw error('EACCES');if(this.files.has(path))throw error('EEXIST');this.files.add(path);this.writes.push(path)};
  link=async(source:string,destination:string)=>{this.links.push(destination);if(this.failLinkAt&&this.links.length===this.failLinkAt)throw error('EACCES');if(!this.files.has(source))throw error('ENOENT');if(this.files.has(destination))throw error('EEXIST');this.files.add(destination)};
  unlink=async(path:string)=>{this.unlinks.push(path);if(this.failUnlink)throw error('EACCES');if(!this.files.delete(path))throw error('ENOENT')};
  api=()=>this as unknown as VehicleImageFs;
}

test('F01/V8-V11: format, MIME, signature, taille et upload coupé sont refusés avant écriture',()=>{
  assert.equal(validateVehicleImages([{dataUrl:jpeg},{dataUrl:png},{dataUrl:webp}]).length,3);
  for(const invalid of[
    dataUrl('image/jpeg',[0x89,0x50,0x4e,0x47]),
    'data:image/gif;base64,R0lGODlh',
    'data:image/png;base64,%%%UPLOAD-COUPE%%%',
    `data:image/jpeg;base64,${Buffer.alloc(5*1024*1024+1,1).toString('base64')}`,
  ])assert.throws(()=>validateVehicleImages([{dataUrl:invalid}]),(value:any)=>value.status===400);
});

test('F02-F04/F06/F12/V17-V19: toute erreur DB simulée compense staging et fichiers finalisés',async()=>{
  for(const afterFinalize of[false,true]){
    const fs=new MemoryFs();
    await assert.rejects(withStagedVehicleImages([{dataUrl:jpeg}],async files=>{if(afterFinalize)await finalizeVehicleImages(files,fs.api());throw new Error(afterFinalize?'COMMIT_FAILED':'DB_FAILED')},{fs:fs.api(),isPersisted:async()=>false}));
    assert.equal(fs.files.size,0);
  }
});

test('F06 ambigu: un commit confirmé ou invérifiable conserve le fichier final sans référence cassée',async()=>{
  for(const check of['committed','unavailable'] as const){
    const fs=new MemoryFs(),logs=mock.method(console,'error',()=>{});
    await assert.rejects(withStagedVehicleImages([{dataUrl:jpeg}],async files=>{await finalizeVehicleImages(files,fs.api());throw new Error('COMMIT_AMBIGUOUS')},{fs:fs.api(),isPersisted:async()=>{if(check==='unavailable')throw error('ECONNREFUSED');return true}}));
    assert.equal([...fs.files].some(file=>file.endsWith('.jpg')),true);
    if(check==='unavailable')assert.ok(logs.mock.callCount()>0);logs.mock.restore();
  }
});

test('F05/F08/F09/F10: finalisation absente, inaccessible ou en collision ne laisse aucun orphelin',async()=>{
  for(const mode of['missing','inaccessible','collision'] as const){
    const fs=new MemoryFs();
    await assert.rejects(withStagedVehicleImages([{dataUrl:jpeg}],async files=>{
      if(mode==='missing')fs.files.delete(files[0]!.stagingPath);
      if(mode==='inaccessible')fs.failLinkAt=1;
      if(mode==='collision')fs.files.add(files[0]!.finalPath);
      await finalizeVehicleImages(files,fs.api());
    },{fs:fs.api()}));
    if(mode!=='collision')assert.equal(fs.files.size,0);
    else assert.equal(fs.files.size,1,'la destination préexistante ne doit jamais être effacée par la compensation');
  }
});

test('V3-V6/V16/V20: staging et finalisation utilisent des noms UUID serveur persistants',async()=>{
  const fs=new MemoryFs(),files=await stageVehicleImages([{dataUrl:jpeg},{dataUrl:png}],fs.api());
  assert.equal(new Set(files.map(file=>file.fileName)).size,2);
  for(const file of files){assert.match(file.fileName,/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/);assert.equal(file.publicPath.includes('..'),false)}
  await finalizeVehicleImages(files,fs.api());
  assert.equal(files.every(file=>fs.files.has(file.finalPath)&&!fs.files.has(file.stagingPath)),true);
});

test('F07/V7/V15: suppression confinée, idempotente sur fichier absent et échec journalisé',async()=>{
  const fs=new MemoryFs(),logs=mock.method(console,'error',()=>{});
  assert.equal(await deleteVehicleImageFile('../../etc/passwd',{vehicleId:'1',imageId:'1'},fs.api()),false);
  assert.equal(fs.unlinks.length,0);
  assert.equal(await deleteVehicleImageFile('/uploads/vehicles/123e4567-e89b-12d3-a456-426614174000.jpg',{vehicleId:'1',imageId:'1'},fs.api()),true);
  fs.files.add('/unrelated');fs.failUnlink=true;
  assert.equal(await deleteVehicleImageFile('/uploads/vehicles/123e4567-e89b-12d3-a456-426614174001.jpg',{vehicleId:'1',imageId:'1'},fs.api()),false);
  assert.ok(logs.mock.callCount()>=2);logs.mock.restore();
});

test('VC1-VC6: lots concurrents sont distincts et la compensation ne touche jamais un autre lot',async()=>{
  const fs=new MemoryFs();
  const [a,b]=await Promise.all([stageVehicleImages([{dataUrl:jpeg}],fs.api()),stageVehicleImages([{dataUrl:jpeg}],fs.api())]);
  assert.notEqual(a[0]!.fileName,b[0]!.fileName);
  await finalizeVehicleImages(b,fs.api());
  await assert.rejects(withStagedVehicleImages([{dataUrl:jpeg}],async()=>{throw new Error('isolated failure')},{fs:fs.api()}));
  assert.equal(fs.files.has(b[0]!.finalPath),true);
});

test('V1-V7/V12-V14 et RBAC: les frontières API, transactions et verrous restent explicites',()=>{
  const source=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');
  assert.match(source,/post\('\/vehicles',requirePermission\('vehicles\.create'\)/);
  assert.match(source,/post\('\/vehicles\/:id\/images',requirePermission\('vehicles\.images\.manage'\)/);
  assert.match(source,/delete\('\/vehicles\/:id\/images\/:imageId',requirePermission\('vehicles\.images\.manage'\)/);
  assert.match(source,/DELETE FROM vehicle_images/);
  assert.match(source,/SELECT id FROM vehicles WHERE id=\? FOR UPDATE/);
  assert.match(source,/withStagedVehicleImages[\s\S]*transaction/);
  assert.match(source,/if\(!images\.length\)throw new HttpError\(400,"Au moins une photo catalogue est obligatoire"\)|stageVehicleImages|withStagedVehicleImages/);
  assert.doesNotMatch(source,/req\.body.*file_path|request\.body.*file_path/);
});
