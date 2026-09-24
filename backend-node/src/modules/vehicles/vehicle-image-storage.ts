import { link, mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../../shared/http-error.js';

export interface VehicleImageInput { dataUrl: string; name?: string }
export interface StagedVehicleImage { mime: string; size: number; fileName: string; publicPath: string; stagingPath: string; finalPath: string; finalized: boolean }
export interface VehicleImageFs {
  mkdir: typeof mkdir; writeFile: typeof writeFile; link: typeof link; unlink: typeof unlink;
}
const nativeFs: VehicleImageFs = { mkdir, writeFile, link, unlink };
export const vehicleImageRoot=path.resolve(process.env.UPLOAD_DIR??'uploads','vehicles');
const stagingRoot=path.join(vehicleImageRoot,'.staging');

function imageBuffer(input: VehicleImageInput) {
  const match=input?.dataUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)throw new HttpError(400,'Format d’image invalide');
  const mime=match[1]!,buffer=Buffer.from(match[2]!,'base64');
  if(!buffer.length||buffer.length>5*1024*1024)throw new HttpError(400,'Chaque image doit peser moins de 5 Mo');
  const jpeg=mime==='image/jpeg'&&buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
  const png=mime==='image/png'&&buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  const webp=mime==='image/webp'&&buffer.length>=12&&buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP';
  if(!jpeg&&!png&&!webp)throw new HttpError(400,'Signature de fichier image invalide');
  return{mime,buffer};
}

export function validateVehicleImages(images: VehicleImageInput[]) {
  if(!Array.isArray(images)||!images.length)throw new HttpError(400,'Sélectionnez au moins une image');
  if(images.length>8)throw new HttpError(400,'Maximum 8 images par véhicule');
  return images.map(imageBuffer);
}

export async function stageVehicleImages(images: VehicleImageInput[], fs: VehicleImageFs=nativeFs) {
  const files=validateVehicleImages(images),staged:StagedVehicleImage[]=[];
  await fs.mkdir(stagingRoot,{recursive:true});await fs.mkdir(vehicleImageRoot,{recursive:true});
  try{
    for(const {mime,buffer} of files){
      const extension=mime==='image/jpeg'?'jpg':mime.split('/')[1]!,fileName=`${randomUUID()}.${extension}`;
      const item={mime,size:buffer.length,fileName,publicPath:`/uploads/vehicles/${fileName}`,stagingPath:path.join(stagingRoot,`${fileName}.tmp`),finalPath:path.join(vehicleImageRoot,fileName),finalized:false};
      await fs.writeFile(item.stagingPath,buffer,{flag:'wx'});staged.push(item);
    }
    return staged;
  }catch(error){await cleanupVehicleImageBatch(staged,true,fs,'stage');throw error}
}

export async function withStagedVehicleImages<T>(images:VehicleImageInput[],work:(files:StagedVehicleImage[])=>Promise<T>,options:{fs?:VehicleImageFs;isPersisted?:(files:StagedVehicleImage[])=>Promise<boolean>}={}){
  const fs=options.fs??nativeFs,files=await stageVehicleImages(images,fs);let completed=false;
  try{const value=await work(files);completed=true;return value}
  catch(error){
    if(files.some(file=>file.finalized)&&options.isPersisted){
      try{completed=await options.isPersisted(files)}catch(checkError){completed=true;logCleanup('commit-state-unknown',files.map(file=>file.fileName).join(','),checkError)}
    }
    throw error;
  }
  finally{await cleanupVehicleImageBatch(files,!completed,fs,completed?'staging-cleanup':'compensation')}
}

export async function finalizeVehicleImages(files: StagedVehicleImage[], fs: VehicleImageFs=nativeFs) {
  for(const file of files){
    // link() crée la destination atomiquement et échoue si elle existe : aucune
    // collision ne peut écraser un fichier valide. Staging et final sont dans
    // le même volume, donc le hard-link ne traverse jamais un filesystem.
    await fs.link(file.stagingPath,file.finalPath);
    file.finalized=true;
    await fs.unlink(file.stagingPath).catch(error=>logCleanup('finalize-staging',file.fileName,error));
  }
}

export async function cleanupVehicleImageBatch(files: StagedVehicleImage[], includeFinal: boolean, fs: VehicleImageFs=nativeFs, operation='compensation') {
  for(const file of files){
    await fs.unlink(file.stagingPath).catch(error=>ignoreMissingOrLog(operation,file.fileName,error));
    if(includeFinal&&file.finalized)await fs.unlink(file.finalPath).catch(error=>ignoreMissingOrLog(operation,file.fileName,error));
  }
}

export async function deleteVehicleImageFile(publicPath: unknown, context: {vehicleId:string;imageId:string}, fs: VehicleImageFs=nativeFs) {
  const value=String(publicPath??'');
  const match=value.match(/^\/uploads\/vehicles\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i);
  if(!match){console.error('[VEHICLE_IMAGE] suppression refusée',{operation:'delete',...context,reason:'UNMANAGED_PATH'});return false}
  try{await fs.unlink(path.join(vehicleImageRoot,match[1]!));return true}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return true;logCleanup('delete',match[1]!,error,context);return false}
}

export async function cleanupStaleVehicleImageStaging(maxAgeMs=24*60*60*1000) {
  await mkdir(stagingRoot,{recursive:true});const now=Date.now();
  for(const entry of await readdir(stagingRoot,{withFileTypes:true})){
    if(!entry.isFile()||!entry.name.endsWith('.tmp'))continue;
    const target=path.join(stagingRoot,entry.name);
    try{if(now-(await stat(target)).mtimeMs>maxAgeMs)await unlink(target)}catch(error){ignoreMissingOrLog('startup-staging-cleanup',entry.name,error)}
  }
}

function ignoreMissingOrLog(operation:string,fileName:string,error:unknown){if((error as NodeJS.ErrnoException).code!=='ENOENT')logCleanup(operation,fileName,error)}
function logCleanup(operation:string,fileName:string,error:unknown,context:Record<string,string>={}){const value=error as NodeJS.ErrnoException;console.error('[VEHICLE_IMAGE] compensation échouée',{operation,fileName,...context,code:value.code,message:value.message})}

// Garde explicite : seul le répertoire interne calculé côté serveur est utilisé.
if(!stagingRoot.startsWith(`${vehicleImageRoot}${path.sep}`))throw new Error('Répertoire de staging véhicule invalide');
