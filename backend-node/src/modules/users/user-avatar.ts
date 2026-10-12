import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../../shared/http-error.js';
import type { UploadedDocument } from '../documents/document-storage.js';

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;
const TYPES: Record<string, string> = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const root = () => path.resolve(process.env.UPLOAD_DIR ?? 'uploads', 'avatars');
function signatureMatches(mimeType:string,buffer:Buffer){if(mimeType==='image/png')return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));if(mimeType==='image/jpeg')return buffer.length>=4&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[buffer.length-2]===0xff&&buffer[buffer.length-1]===0xd9;if(mimeType==='image/webp')return buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';return false}

export async function saveAvatar(file?: UploadedDocument) {
  if (!file) throw new HttpError(400, 'Fichier avatar requis.');
  const extension = TYPES[file.mimeType];
  if (!extension) throw new HttpError(400, 'Format avatar invalide. Utilisez JPEG, PNG ou WebP.');
  if (!file.buffer.length || file.buffer.length > MAX_AVATAR_SIZE) throw new HttpError(413, 'Avatar trop volumineux (3 Mo maximum).');
  if(!signatureMatches(file.mimeType,file.buffer))throw new HttpError(415,'Le contenu du fichier avatar ne correspond pas au format annoncé.');
  await mkdir(root(), { recursive: true });
  const name = `${randomUUID()}.${extension}`;
  await writeFile(path.join(root(), name), file.buffer, { flag: 'wx' });
  return `/uploads/avatars/${name}`;
}

export async function removeAvatar(avatarPath?: string | null) {
  if (!avatarPath?.startsWith('/uploads/avatars/')) return;
  const file = path.resolve(process.env.UPLOAD_DIR ?? 'uploads', avatarPath.replace(/^\/uploads\//, ''));
  if (!file.startsWith(`${root()}${path.sep}`)) return;
  await unlink(file).catch(() => undefined);
}
