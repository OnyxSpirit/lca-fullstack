import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {HttpError} from '../../shared/http-error.js';

export const CUSTOMER_IDENTITY_CONFLICT_MESSAGE='Un client avec ces coordonnées existe déjà dans cette agence.';
export const CUSTOMER_IDENTITY_AMBIGUOUS_MESSAGE='Ces coordonnées correspondent à plusieurs clients de cette agence.';
export const CUSTOMER_IDENTITY_INDEXES=['uq_customer_agency_normalized_email','uq_customer_agency_normalized_phone'] as const;

export const normalizeCustomerEmail=(value:string|null|undefined)=>{
  const trimmed=value?.trim()??'';
  return trimmed?trimmed.toLowerCase():null;
};

export const normalizeCustomerPhone=(value:string|null|undefined)=>{
  const normalized=(value??'').replace(/[^0-9]/g,'');
  return normalized||null;
};

export const isCustomerIdentityDuplicate=(error:unknown)=>{
  const mysql=error as{code?:string;sqlMessage?:string;message?:string};
  if(mysql?.code!=='ER_DUP_ENTRY')return false;
  const diagnostic=`${mysql.sqlMessage??''} ${mysql.message??''}`;
  return CUSTOMER_IDENTITY_INDEXES.some(index=>diagnostic.includes(index));
};

export const customerIdentityConflict=()=>new HttpError(409,CUSTOMER_IDENTITY_CONFLICT_MESSAGE);

type IdentityMatch=RowDataPacket&{id:string|number;email_match:number;phone_match:number};

export async function findCustomerIdentityMatches(
  connection:Pick<PoolConnection,'execute'>,
  agencyId:string,
  email:string|null,
  phone:string|null,
  excludeId:string|null=null,
  lock=false,
){
  const normalizedEmail=normalizeCustomerEmail(email),normalizedPhone=normalizeCustomerPhone(phone);
  if(!normalizedEmail&&!normalizedPhone)return [];
  const[rows]=await connection.execute<IdentityMatch[]>(`SELECT id,
    (normalized_email IS NOT NULL AND normalized_email=?) email_match,
    (normalized_phone IS NOT NULL AND normalized_phone=?) phone_match
    FROM customers
    WHERE agency_id=? AND (? IS NULL OR id<>?)
      AND ((? IS NOT NULL AND normalized_email=?) OR (? IS NOT NULL AND normalized_phone=?))
    ${lock?'FOR UPDATE':''}`,[normalizedEmail,normalizedPhone,agencyId,excludeId,excludeId,normalizedEmail,normalizedEmail,normalizedPhone,normalizedPhone]);
  return rows.map(row=>({id:String(row.id),emailMatch:Boolean(row.email_match),phoneMatch:Boolean(row.phone_match)}));
}

export function resolveUnambiguousCustomer(matches:Array<{id:string;emailMatch:boolean;phoneMatch:boolean}>){
  const emailIds=new Set(matches.filter(match=>match.emailMatch).map(match=>match.id));
  const phoneIds=new Set(matches.filter(match=>match.phoneMatch).map(match=>match.id));
  const ids=new Set([...emailIds,...phoneIds]);
  if(ids.size>1)throw new HttpError(409,CUSTOMER_IDENTITY_AMBIGUOUS_MESSAGE);
  return ids.values().next().value as string|undefined;
}
