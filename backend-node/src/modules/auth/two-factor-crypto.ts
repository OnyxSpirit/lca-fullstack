import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/http-error.js';

export interface EncryptedSecret{ciphertext:string;iv:string;tag:string;keyVersion:string}

function key(){
  if(!env.twoFactor.encryptionKey)throw new HttpError(503,'La double authentification n’est pas configurée sur ce serveur.');
  const value=Buffer.from(env.twoFactor.encryptionKey,'base64');
  if(value.length!==32)throw new HttpError(503,'La clé de chiffrement 2FA est invalide.');
  return value;
}

export function encryptSecret(secret:string):EncryptedSecret{
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
  cipher.setAAD(Buffer.from(`lca-2fa:${env.twoFactor.keyVersion}`));
  const ciphertext=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]);
  return{ciphertext:ciphertext.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),keyVersion:env.twoFactor.keyVersion};
}

export function decryptSecret(value:EncryptedSecret){
  if(value.keyVersion!==env.twoFactor.keyVersion)throw new HttpError(503,'La version de clé 2FA requise n’est pas disponible.');
  try{
    const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(value.iv,'base64'));
    decipher.setAAD(Buffer.from(`lca-2fa:${value.keyVersion}`));
    decipher.setAuthTag(Buffer.from(value.tag,'base64'));
    return Buffer.concat([decipher.update(Buffer.from(value.ciphertext,'base64')),decipher.final()]).toString('utf8');
  }catch(error){
    if(error instanceof HttpError)throw error;
    throw new HttpError(503,'Le facteur 2FA ne peut pas être déchiffré en sécurité.');
  }
}

export const hashRecoveryCode=(code:string)=>createHash('sha256').update(`lca-2fa-recovery:${code.replace(/[\s-]/g,'').toUpperCase()}`).digest('hex');
export const contextHash=(ip:string,userAgent:string)=>createHash('sha256').update(`${ip}\n${userAgent}`).digest('hex');
