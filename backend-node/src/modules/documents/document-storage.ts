import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from '../../shared/http-error.js';

export const MAX_DOCUMENT_SIZE=15*1024*1024;
const MIME_EXTENSIONS:Record<string,string>={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'};
const storageRoot=path.resolve(process.env.GED_STORAGE_DIR??'ged-storage');
const legacyRoot=path.resolve(process.env.UPLOAD_DIR??'uploads');

export type UploadedDocument={originalName:string;mimeType:string;buffer:Buffer};

function signatureMatches(file:UploadedDocument){const b=file.buffer;return file.mimeType==='application/pdf'&&b.subarray(0,5).toString()==='%PDF-'||file.mimeType==='image/png'&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||file.mimeType==='image/jpeg'&&b[0]===0xff&&b[1]===0xd8&&b[b.length-2]===0xff&&b[b.length-1]===0xd9}
export function validateDocumentFile(file:UploadedDocument){if(!file.originalName.trim())throw new HttpError(400,'Nom original du fichier manquant');if(!file.buffer.length)throw new HttpError(400,'Fichier vide');if(file.buffer.length>MAX_DOCUMENT_SIZE)throw new HttpError(413,'Fichier trop volumineux (15 Mo maximum)');const extension=path.extname(file.originalName).slice(1).toLowerCase(),expected=MIME_EXTENSIONS[file.mimeType];if(!expected)throw new HttpError(415,'Format non autorisé');if(!((expected==='jpg'&&['jpg','jpeg'].includes(extension))||extension===expected)||!signatureMatches(file))throw new HttpError(415,'Extension, type MIME ou contenu du fichier incohérent');return expected}
export function documentHash(buffer:Buffer){return createHash('sha256').update(buffer).digest('hex')}
export async function storeDocument(file:UploadedDocument,agencyId:string|null){const extension=validateDocumentFile(file),now=new Date(),relative=path.posix.join(agencyId??'shared',String(now.getUTCFullYear()),String(now.getUTCMonth()+1).padStart(2,'0'),`${now.getTime()}-${randomUUID()}.${extension}`),absolute=path.join(storageRoot,...relative.split('/'));await mkdir(path.dirname(absolute),{recursive:true});await writeFile(absolute,file.buffer,{flag:'wx'});return{storageKey:relative,absolute}}
function safeUnder(root:string,value:string){const candidate=path.resolve(root,value.replace(/^[/\\]+/,''));if(candidate!==root&&!candidate.startsWith(root+path.sep))throw new HttpError(400,'Chemin documentaire invalide');return candidate}
export function resolveDocumentPath(fileUrl:string){if(fileUrl.startsWith('ged:'))return safeUnder(storageRoot,fileUrl.slice(4));const clean=fileUrl.replace(/^https?:\/\/[^/]+/,'').replace(/^\/uploads\//,'');return safeUnder(legacyRoot,clean)}
export async function requireDocumentFile(fileUrl:string){const absolute=resolveDocumentPath(fileUrl);try{await access(absolute)}catch{throw new HttpError(410,'Fichier documentaire indisponible')}return absolute}

