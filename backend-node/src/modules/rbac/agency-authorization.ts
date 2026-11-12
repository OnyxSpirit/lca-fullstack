import type{NextFunction,Request,Response}from'express';
import type{PoolConnection,RowDataPacket}from'mysql2/promise';
import{query,transaction,transactionWithDeadlockRetry}from'../../config/database.js';
import{HttpError}from'../../shared/http-error.js';
import{resolveAgencyRbacContext,resolveAgencyRbacContextWithRunner,type AgencyRbacContext}from'./agency-rbac.service.js';
import{legacyRbacContextFromAgency,type PermissionScope}from'./rbac.service.js';

export type AgencyBusinessScope='OWN'|'AGENCY';
export interface AuthorizationRunner{execute:<T extends RowDataPacket[]>(sql:string,params?:any[])=>Promise<[T,unknown]>}
export interface AgencyDataScope{scope:AgencyBusinessScope;sql:string;params:unknown[]}
export interface AgencyResource{agencyId:string;ownerId?:string|null}
export interface OwnershipCheckInput<T>{resource:T;userId:string;activeAgencyId:string;runner:AuthorizationRunner}
export interface AgencyResourceStrategy<T>{
 load:(runner:AuthorizationRunner,resourceId:string,lock:'none'|'share'|'update')=>Promise<T|null>;
 agencyId:(resource:T)=>string|null|undefined;
 agencyIndependent?:(resource:T)=>boolean;
 isOwner?:(input:OwnershipCheckInput<T>)=>boolean|Promise<boolean>;
}
export interface AuthorizedAgencyResource<T>{context:AgencyRbacContext;scope:AgencyBusinessScope;resource:T}
export interface AgencySqlStrategy{
 agencyColumn:string;
 ownPredicate?:(input:{userId:string;activeAgencyId:string})=>{sql:string;params:unknown[]};
 ownRequiresAgency?:boolean;
}
export interface InterAgencyAuthorizationPlan{
 sourceAgencyId:string;
 destinationAgencyId:string;
 sourcePermission:string;
 destinationAuthorization:(input:{request:Request;context:AgencyRbacContext;destinationAgencyId:string})=>Promise<boolean>;
}

const databaseRunner:AuthorizationRunner={execute:async<T extends RowDataPacket[]>(sql:string,params?:any[])=>[await query<T>(sql,params??[]),[]] as[T,unknown]};
const businessScope=(scope:PermissionScope|null):AgencyBusinessScope=>{if(scope!=='OWN'&&scope!=='AGENCY')throw new HttpError(403,'La permission ne possède pas un scope métier OWN ou AGENCY');return scope};
const sqlIdentifier=(value:string)=>{if(!/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(value))throw new Error('UNSAFE_AGENCY_SQL_IDENTIFIER');return value};
const safePredicate=(predicate:{sql:string;params:unknown[]})=>{const sql=predicate.sql.trim();if(!sql||/(?:^|\W)1\s*=\s*1(?:\W|$)|;|--|\/\*/.test(sql))throw new Error('UNSAFE_AGENCY_SQL_PREDICATE');return{sql,params:[...predicate.params]}};
const samePermissions=(left:Map<string,PermissionScope|null>,right:Map<string,PermissionScope|null>)=>left.size===right.size&&[...left].every(([permission,scope])=>right.get(permission)===scope);

export async function resolveRequestAgencyContext(request:Request){
 if(!request.user)throw new HttpError(401,'Jeton manquant');
 const context=request.agencyRbac??await resolveAgencyRbacContext(request.user.sub,request.user.sid);request.agencyRbac=context;return context;
}

export async function assertAgencyPermission(request:Request,permission:string){
 const context=await resolveRequestAgencyContext(request);if(!context.activeAgencyId)throw new HttpError(403,'Aucune agence active autorisée');
 if(!context.permissions.has(permission))throw new HttpError(403,'Permission agence insuffisante : '+permission);
 return context.permissions.get(permission)??null;
}

export async function assertAgencyBusinessPermission(request:Request,permission:string){const context=await resolveRequestAgencyContext(request),scope=assertAgencyBusinessPermissionInContext(context,permission);request.rbac?.permissions.set(permission,scope);return scope}
export function assertAgencyBusinessPermissionInContext(context:AgencyRbacContext,permission:string){if(!context.activeAgencyId)throw new HttpError(403,'Aucune agence active autorisée');if(!context.permissions.has(permission))throw new HttpError(403,'Permission agence insuffisante');if(context.isSuperAdmin)return'AGENCY';return businessScope(context.permissions.get(permission)??null)}

export async function assertAnyAgencyPermission(request:Request,permissions:string[]){
 const context=await resolveRequestAgencyContext(request);if(!context.activeAgencyId)throw new HttpError(403,'Aucune agence active autorisée');
 for(const permission of permissions)if(context.permissions.has(permission))return{permission,scope:context.permissions.get(permission)??null};
 throw new HttpError(403,'Aucune permission agence requise n’est attribuée.');
}
export async function assertAnyAgencyBusinessPermission(request:Request,permissions:string[]){const context=await resolveRequestAgencyContext(request);if(!context.activeAgencyId)throw new HttpError(403,'Aucune agence active autorisée');for(const permission of permissions)if(context.permissions.has(permission)){const scope=context.isSuperAdmin?'AGENCY':businessScope(context.permissions.get(permission)??null);request.rbac?.permissions.set(permission,scope);return{permission,scope}}throw new HttpError(403,'Aucune permission métier agence requise n’est attribuée.')}

export const requireAgencyPermission=(permission:string)=>async(request:Request,_response:Response,next:NextFunction)=>{try{await assertAgencyPermission(request,permission);next()}catch(error){next(error)}};
export const requireAgencyBusinessPermission=(permission:string)=>async(request:Request,_response:Response,next:NextFunction)=>{try{await assertAgencyBusinessPermission(request,permission);next()}catch(error){next(error)}};
export const requireAnyAgencyPermission=(permissions:string[])=>async(request:Request,_response:Response,next:NextFunction)=>{try{await assertAnyAgencyPermission(request,permissions);next()}catch(error){next(error)}};
export const requireAnyAgencyBusinessPermission=(permissions:string[])=>async(request:Request,_response:Response,next:NextFunction)=>{try{await assertAnyAgencyBusinessPermission(request,permissions);next()}catch(error){next(error)}};
export const requireCentralAgencyPermission=(permission:string)=>async(request:Request,_response:Response,next:NextFunction)=>{try{await assertCentralAgencyPermission(request,permission);next()}catch(error){next(error)}};
export async function assertAgencyBusinessOrCentralPermission(request:Request,permission:string){const context=await resolveRequestAgencyContext(request);if(context.isSuperAdmin&&context.permissions.has(permission))return{context,mode:'CENTRAL' as const,scope:context.permissions.get(permission)??null};return{context,mode:'AGENCY' as const,scope:assertAgencyBusinessPermissionInContext(context,permission)}}
export const requireAgencyBusinessOrCentralPermission=(permission:string)=>async(request:Request,_response:Response,next:NextFunction)=>{try{await assertAgencyBusinessOrCentralPermission(request,permission);next()}catch(error){next(error)}};

export async function assertAgencyAccess(request:Request,agencyId:string){
 const context=await resolveRequestAgencyContext(request);
 if(!context.activeAgencyId||context.activeAgencyId!==String(agencyId))throw new HttpError(403,'Ressource hors de l’agence active');
 return context;
}

/** Compatibilité 2B. Les nouveaux modules doivent préférer authorizeAgencyResource. */
export async function assertAgencyResource(request:Request,permission:string,resource:AgencyResource){
 const scope=businessScope(await assertAgencyPermission(request,permission)),context=await assertAgencyAccess(request,resource.agencyId);
 if(scope==='OWN'&&!(resource.ownerId!=null&&String(resource.ownerId)===request.user!.sub))throw new HttpError(403,'Ressource hors du périmètre OWN');
 return{context,scope};
}

/**
 * La stratégie charge la ressource côté serveur, résout son agence réelle et
 * définit OWN. Le client ne peut fournir ni agence fiable, ni booléen owned.
 */
export async function authorizeAgencyResource<T>(request:Request,permission:string,resourceId:string,strategy:AgencyResourceStrategy<T>,options:{runner?:AuthorizationRunner;lock?:'none'|'share'|'update';context?:AgencyRbacContext}={}):Promise<AuthorizedAgencyResource<T>>{
 const context=options.context??await resolveRequestAgencyContext(request),scope=options.context?assertAgencyBusinessPermissionInContext(context,permission):businessScope(await assertAgencyPermission(request,permission)),runner=options.runner??databaseRunner,lock=options.lock??'none';
 if(lock!=='none'&&!options.runner)throw new Error('LOCKED_RESOURCE_REQUIRES_TRANSACTION_RUNNER');
 const resource=await strategy.load(runner,String(resourceId),lock);if(!resource)throw new HttpError(404,'Ressource introuvable');
 const agencyId=strategy.agencyId(resource);if(agencyId==null||agencyId===''){if(!strategy.agencyIndependent?.(resource))throw new HttpError(403,'Agence de la ressource indéterminée')}else if(String(agencyId)!==context.activeAgencyId)throw new HttpError(403,'Ressource hors de l’agence active');
 if(scope==='OWN'){
  if(!strategy.isOwner)throw new HttpError(403,'Une règle de propriété métier explicite est requise pour le scope OWN');
  if(!await strategy.isOwner({resource,userId:context.userId,activeAgencyId:context.activeAgencyId!,runner}))throw new HttpError(403,'Ressource hors du périmètre OWN');
 }
 return{context,scope,resource};
}

/** OWN/AGENCY uniquement, agence active toujours liée, règle OWN explicite. */
export async function resolveAgencyDataScope(request:Request,permission:string,strategy:AgencySqlStrategy):Promise<AgencyDataScope>{
 const scope=businessScope(await assertAgencyPermission(request,permission)),context=await resolveRequestAgencyContext(request),agency=context.activeAgencyId!,agencyColumn=sqlIdentifier(strategy.agencyColumn);
 if(scope==='AGENCY')return{scope,sql:`${agencyColumn}=?`,params:[agency]};
 if(!strategy.ownPredicate)throw new HttpError(403,'Une règle de propriété métier explicite est requise pour le scope OWN');
 const own=safePredicate(strategy.ownPredicate({userId:context.userId,activeAgencyId:agency}));
 return strategy.ownRequiresAgency===false?{scope,sql:own.sql,params:own.params}:{scope,sql:`${agencyColumn}=? AND (${own.sql})`,params:[agency,...own.params]};
}

export async function assertAgencyContextCurrent(request:Request,runner:AuthorizationRunner=databaseRunner){
 const context=await resolveRequestAgencyContext(request),[rows]=await runner.execute<RowDataPacket[]>('SELECT active_agency_id,agency_context_version FROM refresh_tokens WHERE id=? AND user_id=? AND revoked_at IS NULL AND expires_at>NOW()',[context.sessionId,context.userId]),session=rows[0];
 if(!session||String(session.active_agency_id??'')!==String(context.activeAgencyId??'')||Number(session.agency_context_version)!==context.contextVersion)throw new HttpError(409,'AGENCY_CONTEXT_CHANGED');
 return context;
}

async function lockCurrentAuthorization(connection:PoolConnection,context:AgencyRbacContext){
 const[sessionRows]=await connection.execute<RowDataPacket[]>('SELECT active_agency_id,agency_context_version FROM refresh_tokens WHERE id=? AND user_id=? AND revoked_at IS NULL AND expires_at>NOW() FOR SHARE',[context.sessionId,context.userId]),session=sessionRows[0];
 if(!session||String(session.active_agency_id??'')!==String(context.activeAgencyId??'')||Number(session.agency_context_version)!==context.contextVersion)throw new HttpError(409,'AGENCY_CONTEXT_CHANGED');
 if(context.isSuperAdmin){
  const[rows]=await connection.execute<RowDataPacket[]>(`SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE FOR SHARE`,[context.userId]);
  if(!rows[0])throw new HttpError(409,'AGENCY_AUTHORIZATION_CHANGED');
 }else{
  const[assignments]=await connection.execute<RowDataPacket[]>(`SELECT ua.id FROM user_agencies ua WHERE ua.user_id=? AND ua.agency_id=? AND ua.status='ACTIVE' FOR SHARE`,[context.userId,context.activeAgencyId]);
  if(!assignments[0])throw new HttpError(409,'AGENCY_AUTHORIZATION_CHANGED');
  await connection.execute<RowDataPacket[]>(`SELECT uar.role_id,rp.permission_id FROM user_agency_roles uar JOIN roles r ON r.id=uar.role_id AND r.is_active=TRUE AND r.is_system=FALSE LEFT JOIN role_permissions rp ON rp.role_id=r.id WHERE uar.user_agency_id=? FOR SHARE`,[assignments[0].id]);
 }
 return context;
}

/** Verrouille la session et l'affectation courante pendant toute l'écriture. */
export async function withCurrentAgencyAuthorization<T>(request:Request,work:(connection:PoolConnection,context:AgencyRbacContext)=>Promise<T>){
 return transaction(async connection=>{const cached=await resolveRequestAgencyContext(request),context=await resolveAgencyRbacContextWithRunner(connection,cached.userId,cached.sessionId);if(context.activeAgencyId!==cached.activeAgencyId||context.contextVersion!==cached.contextVersion)throw new HttpError(409,'AGENCY_CONTEXT_CHANGED');if(!samePermissions(cached.permissions,context.permissions))throw new HttpError(409,'AGENCY_AUTHORIZATION_CHANGED');await lockCurrentAuthorization(connection,context);request.agencyRbac=context;request.rbac=legacyRbacContextFromAgency(context);return work(connection,context)});
}
export async function withCurrentAgencyBusinessAuthorization<T>(request:Request,permission:string,work:(connection:PoolConnection,context:AgencyRbacContext,scope:AgencyBusinessScope)=>Promise<T>){return withCurrentAgencyAuthorization(request,async(connection,context)=>{const scope=assertAgencyBusinessPermissionInContext(context,permission);request.rbac?.permissions.set(permission,scope);return work(connection,context,scope)})}
export async function withCurrentAgencyAuthorizationRetry<T>(request:Request,work:(connection:PoolConnection,context:AgencyRbacContext)=>Promise<T>){return transactionWithDeadlockRetry(async connection=>{const cached=await resolveRequestAgencyContext(request),context=await resolveAgencyRbacContextWithRunner(connection,cached.userId,cached.sessionId);if(context.activeAgencyId!==cached.activeAgencyId||context.contextVersion!==cached.contextVersion)throw new HttpError(409,'AGENCY_CONTEXT_CHANGED');if(!samePermissions(cached.permissions,context.permissions))throw new HttpError(409,'AGENCY_AUTHORIZATION_CHANGED');await lockCurrentAuthorization(connection,context);request.agencyRbac=context;request.rbac=legacyRbacContextFromAgency(context);return work(connection,context)})}
export async function withCurrentAgencyBusinessAuthorizationRetry<T>(request:Request,permission:string,work:(connection:PoolConnection,context:AgencyRbacContext,scope:AgencyBusinessScope)=>Promise<T>){return withCurrentAgencyAuthorizationRetry(request,async(connection,context)=>{const scope=assertAgencyBusinessPermissionInContext(context,permission);request.rbac?.permissions.set(permission,scope);return work(connection,context,scope)})}

/** Règle centrale 2B conservée : seul le véritable SUPER_ADMIN système. */
export async function assertCentralAgencyPermission(request:Request,permission:string){const context=await resolveRequestAgencyContext(request);if(!context.isSuperAdmin||!context.permissions.has(permission))throw new HttpError(403,'Autorisation centrale insuffisante');return context.permissions.get(permission)??null}
export function assertCentralAgencyPermissionInContext(context:AgencyRbacContext,permission:string){if(!context.isSuperAdmin||!context.permissions.has(permission))throw new HttpError(403,'Autorisation centrale insuffisante');return context.permissions.get(permission)??null}
export async function withCurrentCentralAuthorization<T>(request:Request,permission:string,work:(context:AgencyRbacContext)=>Promise<T>){return withCurrentAgencyAuthorization(request,async(_connection,context)=>{assertCentralAgencyPermissionInContext(context,permission);return work(context)})}
export async function withCurrentCentralAuthorizationTransaction<T>(request:Request,permission:string,work:(connection:PoolConnection,context:AgencyRbacContext)=>Promise<T>){return withCurrentAgencyAuthorization(request,async(connection,context)=>{assertCentralAgencyPermissionInContext(context,permission);return work(connection,context)})}

/** La règle destination est obligatoire et reste la responsabilité du module. */
export async function assertInterAgencyAuthorization(request:Request,plan:InterAgencyAuthorizationPlan){
 const context=await resolveRequestAgencyContext(request);businessScope(await assertAgencyPermission(request,plan.sourcePermission));
 if(!context.activeAgencyId||context.activeAgencyId!==String(plan.sourceAgencyId))throw new HttpError(403,'Agence source hors du contexte actif');
 if(String(plan.sourceAgencyId)===String(plan.destinationAgencyId))throw new HttpError(400,'Les agences source et destination doivent être distinctes');
 if(!await plan.destinationAuthorization({request,context,destinationAgencyId:String(plan.destinationAgencyId)}))throw new HttpError(403,'Autorisation de l’agence destination insuffisante');
 return{context,sourceAgencyId:String(plan.sourceAgencyId),destinationAgencyId:String(plan.destinationAgencyId)};
}
