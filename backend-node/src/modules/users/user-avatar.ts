import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../../shared/http-error.js';
import type { UploadedDocument } from '../documents/document-storage.js';

const MAX_AVATAR_SIZE = 3 * 1024 * 1024;
const TYPES: Record<string, string> = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const root = () => path.resolve(process.env.UPLOAD_DIR ?? 'uploads', 'avatars');

export async function saveAvatar(file?: UploadedDocument) {
  if (!file) throw new HttpError(400, 'Fichier avatar requis.');
  const extension = TYPES[file.mimeType];
  if (!extension) throw new HttpError(400, 'Format avatar invalide. Utilisez JPEG, PNG ou WebP.');
  if (!file.buffer.length || file.buffer.length > MAX_AVATAR_SIZE) throw new HttpError(413, 'Avatar trop volumineux (3 Mo maximum).');
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
