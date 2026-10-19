import {mkdir,readFile,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {HttpError} from '../../shared/http-error.js';
import type{UploadedDocument}from'../documents/document-storage.js';

const MAX_SIZE=3*1024*1024;
const TYPES:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const PREFIX='hr-provider-media:';
const root=()=>path.resolve(process.env.UPLOAD_DIR??'uploads','private','hr-providers');
const signature=(mime:string,b:Buffer)=>mime==='image/png'?b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?b.length>=4&&b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217:mime==='image/webp'?b.length>=12&&b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP':false;
const name=(value:unknown)=>String(value??'').match(/^hr-provider-media:([0-9a-f-]{36}\.(?:jpg|png|webp))$/i)?.[1]??null;
export async function saveProviderMedia(file?:UploadedDocument){if(!file)throw new HttpError(400,'Photo ou logo requis.');const ext=TYPES[file.mimeType];if(!ext)throw new HttpError(415,'Format invalide. Utilisez JPEG, PNG ou WebP.');if(!file.buffer.length||file.buffer.length>MAX_SIZE)throw new HttpError(413,'Fichier trop volumineux (3 Mo maximum).');if(!signature(file.mimeType,file.buffer))throw new HttpError(415,'Le contenu ne correspond pas au format annoncé.');await mkdir(root(),{recursive:true});const fileName=`${randomUUID()}.${ext}`;await writeFile(path.join(root(),fileName),file.buffer,{flag:'wx'});return`${PREFIX}${fileName}`}
export async function readProviderMedia(value:unknown){const fileName=name(value);if(!fileName)throw new HttpError(404,'Photo ou logo introuvable.');return{buffer:await readFile(path.join(root(),fileName)).catch(()=>{throw new HttpError(404,'Photo ou logo introuvable.')}),mime:fileName.endsWith('.png')?'image/png':fileName.endsWith('.webp')?'image/webp':'image/jpeg'}}
export async function removeProviderMedia(value:unknown){const fileName=name(value);if(fileName)await unlink(path.join(root(),fileName)).catch(()=>undefined)}
