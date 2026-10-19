import {mkdir,readFile,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {HttpError} from '../../shared/http-error.js';
import type{UploadedDocument}from'../documents/document-storage.js';

const MAX_SIZE=3*1024*1024;
const TYPES:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const PREFIX='hr-employee-photo:';
const root=()=>path.resolve(process.env.UPLOAD_DIR??'uploads','private','hr-employees');

function signatureMatches(mime:string,buffer:Buffer){
  if(mime==='image/png')return buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/jpeg')return buffer.length>=4&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[buffer.length-2]===0xff&&buffer[buffer.length-1]===0xd9;
  if(mime==='image/webp')return buffer.length>=12&&buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP';
  return false;
}

function fileName(value:unknown){
  const match=String(value??'').match(/^hr-employee-photo:([0-9a-f-]{36}\.(?:jpg|png|webp))$/i);
  return match?.[1]??null;
}

export async function saveEmployeePhoto(file?:UploadedDocument){
  if(!file)throw new HttpError(400,"Photographie de l'employé requise.");
  const extension=TYPES[file.mimeType];
  if(!extension)throw new HttpError(415,'Format invalide. Utilisez JPEG, PNG ou WebP.');
  if(!file.buffer.length||file.buffer.length>MAX_SIZE)throw new HttpError(413,'Photographie trop volumineuse (3 Mo maximum).');
  if(!signatureMatches(file.mimeType,file.buffer))throw new HttpError(415,'Le contenu du fichier ne correspond pas au format image annoncé.');
  await mkdir(root(),{recursive:true});
  const name=`${randomUUID()}.${extension}`;
  await writeFile(path.join(root(),name),file.buffer,{flag:'wx'});
  return`${PREFIX}${name}`;
}

export async function readEmployeePhoto(value:unknown){
  const name=fileName(value);
  if(!name)throw new HttpError(404,'Photographie introuvable.');
  return{buffer:await readFile(path.join(root(),name)).catch(()=>{throw new HttpError(404,'Photographie introuvable.')}),mime:name.endsWith('.png')?'image/png':name.endsWith('.webp')?'image/webp':'image/jpeg'};
}

export async function removeEmployeePhoto(value:unknown){
  const name=fileName(value);
  if(!name)return;
  await unlink(path.join(root(),name)).catch(()=>undefined);
}

