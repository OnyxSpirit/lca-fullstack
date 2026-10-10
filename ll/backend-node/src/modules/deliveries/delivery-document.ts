import { HttpError } from '../../shared/http-error.js';
import { type UploadedDocument, validateDocumentFile } from '../documents/document-storage.js';

export const MAX_DELIVERY_DOCUMENT_SIZE=10_000_000;

export function decodeDeliveryDocument(base64:string,fileName:string|null,mimeType:string|null):UploadedDocument {
  if(!fileName||!mimeType)throw new HttpError(400,'Nom et type du fichier obligatoires');
  const encoded=base64.replace(/^data:[^;]+;base64,/, '').replace(/\s/g,'');
  if(!encoded||encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw new HttpError(400,'Encodage du fichier invalide');
  const file={originalName:fileName,mimeType,buffer:Buffer.from(encoded,'base64')};
  if(file.buffer.length>MAX_DELIVERY_DOCUMENT_SIZE)throw new HttpError(413,'Fichier supérieur à 10 Mo');
  validateDocumentFile(file);
  return file;
}
