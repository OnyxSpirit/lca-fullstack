import type {Request} from 'express';
import type {PermissionScope} from './rbac.service.js';

export interface ScopePredicate{sql:string;params:unknown[]}
export interface ScopeResource{agency:string;owner?:string;ownRequiresAgency?:boolean}

export function permissionScopePredicate(request:Request,permission:string,resource:ScopeResource):ScopePredicate|null{
  const scope=request.rbac?.permissions.get(permission) as PermissionScope|undefined;
  const agencyId=request.user?.agencyId,userId=request.user?.sub;
  if(!scope)return null;
  if(scope==='GLOBAL')return{sql:'1=1',params:[]};
  if(!agencyId)return null;
  if(scope==='CONCESSION')return{sql:`${resource.agency} IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`,params:[agencyId]};
  if(scope==='AGENCY')return{sql:`${resource.agency}=?`,params:[agencyId]};
  if(scope==='OWN'&&resource.owner&&userId)return resource.ownRequiresAgency===false?{sql:`${resource.owner}=?`,params:[userId]}:{sql:`${resource.agency}=? AND ${resource.owner}=?`,params:[agencyId,userId]};
  return null;
}

export function intersectScopePredicates(...predicates:Array<ScopePredicate|null>):ScopePredicate|null{
  if(predicates.some(predicate=>predicate===null))return null;
  const present=predicates as ScopePredicate[];
  return{sql:present.map(predicate=>`(${predicate.sql})`).join(' AND '),params:present.flatMap(predicate=>predicate.params)};
}
