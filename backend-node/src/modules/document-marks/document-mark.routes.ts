import{unlink}from'node:fs/promises';
import{Router,type Request,type Response}from'express';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';
import{execute,query,transaction}from'../../config/database.js';
import{asyncHandler}from'../../middleware/error-handler.js';
import{requirePermission}from'../../middleware/require-permission.js';
import{HttpError}from'../../shared/http-error.js';
import{writeAudit}from'../activity/audit-writer.js';
import{documentMultipart,type MultipartRequest}from'../documents/document-multipart.js';
import{documentHash,readDocumentFile,storeDocument,type UploadedDocument}from'../documents/document-storage.js';
import{assertPermission,type PermissionScope}from'../rbac/rbac.service.js';

export const documentMarkRouter=Router();
const num=(v:unknown)=>{const x=String(v??'');
if(!/^[1-9]\d*$/.test(x))throw new HttpError(400,'Identifiant invalide');
return x},txt=(v:unknown,n=150)=>String(v??'').trim().slice(0,n);

export const documentMarkTypes=[{code:'QUOTATION',label:'Devis commercial',triggerStatus:'issued',policyManaged:true,stampSupported:true},{code:'SALE_ORDER',label:'Bon de commande automobile',triggerStatus:'confirmed',policyManaged:true,stampSupported:true},{code:'INVOICE',label:'Facture',triggerStatus:'issued',policyManaged:true,stampSupported:true},{code:'PAYMENT_RECEIPT',label:'Reçu de paiement',triggerStatus:'confirmed',policyManaged:true,stampSupported:true},{code:'DELIVERY_REPORT',label:'Procès-verbal de livraison',triggerStatus:'delivered',policyManaged:false,stampSupported:true},{code:'VEHICLE_RETURN_REPORT',label:'Procès-verbal de retour véhicule',triggerStatus:'closed',policyManaged:false,stampSupported:false},{code:'REPAIR_ORDER',label:'Ordre de réparation',triggerStatus:'closed',policyManaged:false,stampSupported:false},{code:'EMPLOYEE_RECORD',label:'Fiche employé',triggerStatus:'generated',policyManaged:false,stampSupported:false}]as const;

const documentType=(v:unknown)=>{const value=txt(v,50).toUpperCase();
if(!documentMarkTypes.some(x=>x.code===value))throw new HttpError(400,'Type de document officiel invalide');
return value};

const stampDocumentTypes=(value:unknown,fallback:unknown)=>{let values:unknown[]=[];
if(Array.isArray(value))values=value;
else if(typeof value==='string'&&value.trim()){try{const parsed=JSON.parse(value);
values=Array.isArray(parsed)?parsed:[value]}catch{values=value.split(',')}}else if(fallback)values=[fallback];
const types=[...new Set(values.map(documentType))];
if(!types.length)throw new HttpError(400,'Au moins un type documentaire est obligatoire');
if(types.some(type=>!documentMarkTypes.find(item=>item.code===type)?.stampSupported))throw new HttpError(400,'Un type documentaire sélectionné ne prend pas encore en charge les cachets');
return types};

const contexts=(value:unknown,fallback:string)=>{if(Array.isArray(value))return value.map(String);
if(typeof value==='string'){try{const parsed=JSON.parse(value);
if(Array.isArray(parsed))return parsed.map(String)}catch{}}return[fallback]};

function rasterDimensions(buffer:Buffer,mime:string){if(mime==='image/png'){const valid=buffer.length>=33&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&buffer.readUInt32BE(8)===13&&buffer.subarray(12,16).toString()==='IHDR'&&buffer.subarray(-12,-8).readUInt32BE(0)===0&&buffer.subarray(-8,-4).toString()==='IEND';
if(!valid)throw new HttpError(415,'PNG invalide ou tronqué');
return{width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)}}if(buffer.length<4||buffer[0]!==255||buffer[1]!==216||buffer.at(-2)!==255||buffer.at(-1)!==217)throw new HttpError(415,'JPEG invalide ou tronqué');
let offset=2;
while(offset<buffer.length-2){if(buffer[offset]!==255)throw new HttpError(415,'Structure JPEG invalide');
while(buffer[offset]===255)offset++;
const marker=buffer[offset++];
if(marker==null)break;
if(marker===217||marker===218)break;
if(marker===1||marker>=208&&marker<=215)continue;
if(offset+2>buffer.length)break;
const length=buffer.readUInt16BE(offset);
if(length<2||offset+length>buffer.length)throw new HttpError(415,'Structure JPEG invalide');
if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){if(length<7)break;
return{height:buffer.readUInt16BE(offset+3),width:buffer.readUInt16BE(offset+5)}}offset+=length}throw new HttpError(415,'Dimensions JPEG introuvables')}
function image(v?:UploadedDocument){if(!v)throw new HttpError(400,'Image obligatoire');
if(v.buffer.length>2*1024*1024)throw new HttpError(413,'Image trop volumineuse (2 Mo maximum)');
const ext=v.originalName.toLowerCase().split('.').pop();
if(!['image/png','image/jpeg'].includes(v.mimeType)||v.mimeType==='image/png'&&ext!=='png'||v.mimeType==='image/jpeg'&&!['jpg','jpeg'].includes(ext??''))throw new HttpError(415,'Extension, MIME ou contenu incohérent');
const{width,height}=rasterDimensions(v.buffer,v.mimeType);
if(width<80||height<30||width>4000||height>4000)throw new HttpError(400,'Dimensions invalides (80x30 à 4000x4000)');
return v}
const send=async(res:Response,row:RowDataPacket)=>{res.setHeader('Content-Type',row.mime_type);
res.setHeader('Content-Disposition','inline; filename="asset-raster"');
res.setHeader('Cache-Control','private, no-store');
res.setHeader('X-Content-Type-Options','nosniff');
res.send(await readDocumentFile(String(row.file_url),row.file_hash))};

const sig=(x:RowDataPacket)=>({id:String(x.id),version:Number(x.version),mimeType:x.mime_type,fileSize:Number(x.file_size),fileHash:x.file_hash,isActive:Boolean(x.is_active),createdAt:x.created_at,revokedAt:x.revoked_at??null});

documentMarkRouter.get('/document-marks/signature/me',requirePermission('signature.view.self'),asyncHandler(async(r,res)=>res.json((await query<RowDataPacket[]>('SELECT * FROM user_signature_versions WHERE user_id=? ORDER BY version DESC',[r.user!.sub])).map(sig))));

documentMarkRouter.post('/document-marks/signature/me',requirePermission('signature.manage.self'),documentMultipart,asyncHandler(async(r:MultipartRequest,res)=>{const f=image(r.documentFile),stored=await storeDocument(f,String(r.user!.agencyId)),hash=documentHash(f.buffer);
try{const id=await transaction(async c=>{const[u]=await c.execute<RowDataPacket[]>('SELECT is_active FROM users WHERE id=? FOR UPDATE',[r.user!.sub]);
if(!u[0]?.is_active)throw new HttpError(403,'Utilisateur inactif');
const[v]=await c.execute<RowDataPacket[]>('SELECT version FROM user_signature_versions WHERE user_id=? ORDER BY version DESC LIMIT 1 FOR UPDATE',[r.user!.sub]),version=Number(v[0]?.version??0)+1;
await c.execute('UPDATE user_signature_versions SET is_active=FALSE,revoked_at=NOW(),revoked_by=? WHERE user_id=? AND is_active=TRUE',[r.user!.sub,r.user!.sub]);
const[x]=await c.execute<ResultSetHeader>('INSERT INTO user_signature_versions(user_id,version,file_url,mime_type,file_size,file_hash,created_by) VALUES(?,?,?,?,?,?,?)',[r.user!.sub,version,`ged:${stored.storageKey}`,f.mimeType,f.buffer.length,hash,r.user!.sub]);
await writeAudit(c,r,{module:'documents',entityType:'user_signature',entityId:String(x.insertId),action:version===1?'signature.created':'signature.replaced',newValues:{version,fileHash:hash}});
return String(x.insertId)});
res.status(201).json({id})}catch(e){await unlink(stored.absolute).catch(()=>undefined);
throw e}}));

documentMarkRouter.delete('/document-marks/signature/me',requirePermission('signature.manage.self'),asyncHandler(async(r,res)=>{await transaction(async c=>{const[x]=await c.execute<RowDataPacket[]>('SELECT id,version,file_hash FROM user_signature_versions WHERE user_id=? AND is_active=TRUE FOR UPDATE',[r.user!.sub]);
if(!x[0])throw new HttpError(404,'Signature active introuvable');
await c.execute('UPDATE user_signature_versions SET is_active=FALSE,revoked_at=NOW(),revoked_by=? WHERE id=?',[r.user!.sub,x[0].id]);
await writeAudit(c,r,{module:'documents',entityType:'user_signature',entityId:String(x[0].id),action:'signature.revoked',newValues:{version:Number(x[0].version),fileHash:x[0].file_hash}})});
res.json({success:true})}));

documentMarkRouter.get('/document-marks/signature/me/:id/image',requirePermission('signature.view.self'),asyncHandler(async(r,res)=>{const[x]=await query<RowDataPacket[]>('SELECT file_url,mime_type,file_hash FROM user_signature_versions WHERE id=? AND user_id=?',[num(r.params.id),r.user!.sub]);
if(!x)throw new HttpError(404,'Signature introuvable');
await send(res,x)}));

function scope(r:Request,s:PermissionScope|null){if(s==='GLOBAL')return{sql:'1=1',p:[]as any[]};
if(s==='CONCESSION')return{sql:'st.concession_id=(SELECT concession_id FROM agencies WHERE id=?)',p:[r.user!.agencyId]};
if(s==='AGENCY')return{sql:'st.agency_id=?',p:[r.user!.agencyId]};
throw new HttpError(403,'Le scope OWN ne gouverne pas les cachets')}
documentMarkRouter.get('/document-marks/stamps',requirePermission('stamp.view'),asyncHandler(async(r,res)=>{
 const w=scope(r,await assertPermission(r,'stamp.view'));

 const rows=await query<RowDataPacket[]>(`SELECT st.*,v.id version_id,v.version,v.mime_type,v.file_size,v.file_hash,(SELECT JSON_ARRAYAGG(dt.document_type) FROM service_stamp_document_types dt WHERE dt.stamp_id=st.id) document_contexts FROM service_stamps st LEFT JOIN service_stamp_versions v ON v.stamp_id=st.id AND v.is_active=TRUE WHERE ${w.sql} ORDER BY st.name`,w.p);

 res.json(rows.map(x=>({id:String(x.id),name:x.name,concessionId:String(x.concession_id),agencyId:x.agency_id?String(x.agency_id):null,departmentId:x.department_id?String(x.department_id):null,categoryId:x.category_id?String(x.category_id):null,documentContext:x.document_context,documentContexts:contexts(x.document_contexts,String(x.document_context)),isActive:Boolean(x.is_active),revokedAt:x.revoked_at??null,revokedBy:x.revoked_by?String(x.revoked_by):null,revocationReason:x.revocation_reason??null,activeVersion:x.version_id?{id:String(x.version_id),version:Number(x.version),mimeType:x.mime_type,fileSize:Number(x.file_size),fileHash:x.file_hash,isActive:true}:null})));

}));

async function target(r:Request,s:PermissionScope|null,agencyId:string|null,departmentId:string|null){if(s==='OWN')throw new HttpError(403,'Scope insuffisant');
const[actor]=await query<RowDataPacket[]>('SELECT concession_id FROM agencies WHERE id=?',[r.user!.agencyId]),[agency]=agencyId?await query<RowDataPacket[]>('SELECT id,concession_id FROM agencies WHERE id=? AND is_active=TRUE',[agencyId]):[];
if(agencyId&&!agency)throw new HttpError(400,'Agence invalide');
if(s==='AGENCY'&&agencyId!==String(r.user!.agencyId)||s==='CONCESSION'&&agency&&String(agency.concession_id)!==String(actor?.concession_id))throw new HttpError(403,'Portée cachet invalide');
if(departmentId){const[d]=await query<RowDataPacket[]>('SELECT agency_id FROM departments WHERE id=? AND is_active=TRUE',[departmentId]);
if(!d||String(d.agency_id)!==agencyId)throw new HttpError(400,'Département incompatible')}return agency?String(agency.concession_id):String(actor!.concession_id)}
documentMarkRouter.post('/document-marks/stamps',requirePermission('stamp.manage'),documentMultipart,asyncHandler(async(r:MultipartRequest,res)=>{const s=await assertPermission(r,'stamp.manage'),f=image(r.documentFile),name=txt(r.body.name),agencyId=txt(r.body.agencyId)||null,departmentId=txt(r.body.departmentId)||null,categoryId=txt(r.body.categoryId)?num(r.body.categoryId):null,documentTypes=stampDocumentTypes(r.body.documentContexts,r.body.documentContext??'DELIVERY_REPORT'),context=documentTypes[0]!;
if(!name)throw new HttpError(400,'Nom requis');
const concession=await target(r,s,agencyId,departmentId),stored=await storeDocument(f,agencyId??String(r.user!.agencyId)),hash=documentHash(f.buffer);
try{const id=await transaction(async c=>{if(categoryId){const[categories]=await c.execute<RowDataPacket[]>('SELECT id FROM service_stamp_categories WHERE id=? AND concession_id=? AND is_active=TRUE FOR UPDATE',[categoryId,concession]);
if(!categories[0])throw new HttpError(400,'Catégorie active incompatible')}const[x]=await c.execute<ResultSetHeader>('INSERT INTO service_stamps(concession_id,agency_id,department_id,category_id,name,document_context,created_by) VALUES(?,?,?,?,?,?,?)',[concession,agencyId,departmentId,categoryId,name,context,r.user!.sub]);
for(const type of documentTypes)await c.execute('INSERT INTO service_stamp_document_types(stamp_id,document_type,created_by) VALUES(?,?,?)',[x.insertId,type,r.user!.sub]);
const[v]=await c.execute<ResultSetHeader>('INSERT INTO service_stamp_versions(stamp_id,version,file_url,mime_type,file_size,file_hash,created_by) VALUES(?,1,?,?,?,?,?)',[x.insertId,`ged:${stored.storageKey}`,f.mimeType,f.buffer.length,hash,r.user!.sub]);
await writeAudit(c,r,{module:'documents',entityType:'service_stamp',entityId:String(x.insertId),action:'stamp.created',newValues:{versionId:String(v.insertId),fileHash:hash,categoryId,documentTypes}});
return String(x.insertId)});
res.status(201).json({id,documentContexts:documentTypes})}catch(e){await unlink(stored.absolute).catch(()=>undefined);
throw e}}));

documentMarkRouter.post('/document-marks/stamps/:id/version',requirePermission('stamp.manage'),documentMultipart,asyncHandler(async(r:MultipartRequest,res)=>{const w=scope(r,await assertPermission(r,'stamp.manage')),f=image(r.documentFile),stored=await storeDocument(f,String(r.user!.agencyId)),hash=documentHash(f.buffer);
try{const id=await transaction(async c=>{const[st]=await c.execute<RowDataPacket[]>(`SELECT st.id FROM service_stamps st WHERE st.id=? AND ${w.sql} FOR UPDATE`,[num(r.params.id),...w.p]);
if(!st[0])throw new HttpError(404,'Cachet introuvable');
const[v]=await c.execute<RowDataPacket[]>('SELECT version FROM service_stamp_versions WHERE stamp_id=? ORDER BY version DESC LIMIT 1 FOR UPDATE',[st[0].id]),version=Number(v[0]?.version??0)+1;
await c.execute('UPDATE service_stamp_versions SET is_active=FALSE,revoked_at=NOW(),revoked_by=? WHERE stamp_id=? AND is_active=TRUE',[r.user!.sub,st[0].id]);
const[x]=await c.execute<ResultSetHeader>('INSERT INTO service_stamp_versions(stamp_id,version,file_url,mime_type,file_size,file_hash,created_by) VALUES(?,?,?,?,?,?,?)',[st[0].id,version,`ged:${stored.storageKey}`,f.mimeType,f.buffer.length,hash,r.user!.sub]);
await writeAudit(c,r,{module:'documents',entityType:'service_stamp',entityId:String(st[0].id),action:'stamp.replaced',newValues:{version,fileHash:hash}});
return String(x.insertId)});
res.status(201).json({id})}catch(e){await unlink(stored.absolute).catch(()=>undefined);
throw e}}));

documentMarkRouter.patch('/document-marks/stamps/:id/document-types',requirePermission('stamp.manage'),asyncHandler(async(r,res)=>{const w=scope(r,await assertPermission(r,'stamp.manage')),documentTypes=stampDocumentTypes(r.body.documentContexts,null);
await transaction(async c=>{const[rows]=await c.execute<RowDataPacket[]>(`SELECT st.id,st.document_context FROM service_stamps st WHERE st.id=? AND ${w.sql} FOR UPDATE`,[num(r.params.id),...w.p]),stamp=rows[0];
if(!stamp)throw new HttpError(404,'Cachet introuvable');
const[before]=await c.execute<RowDataPacket[]>('SELECT document_type FROM service_stamp_document_types WHERE stamp_id=? ORDER BY document_type',[stamp.id]);
await c.execute('DELETE FROM service_stamp_document_types WHERE stamp_id=?',[stamp.id]);
for(const type of documentTypes)await c.execute('INSERT INTO service_stamp_document_types(stamp_id,document_type,created_by) VALUES(?,?,?)',[stamp.id,type,r.user!.sub]);
await c.execute('UPDATE service_stamps SET document_context=?,updated_by=? WHERE id=?',[documentTypes[0],r.user!.sub,stamp.id]);
await writeAudit(c,r,{module:'documents',entityType:'service_stamp',entityId:String(stamp.id),action:'stamp.document_types.updated',oldValues:{documentTypes:before.map(row=>String(row.document_type))},newValues:{documentTypes}})});
res.json({success:true,documentContexts:documentTypes})}));

documentMarkRouter.get('/document-marks/stamps/:id/versions',requirePermission('stamp.view'),asyncHandler(async(r,res)=>{const w=scope(r,await assertPermission(r,'stamp.view')),rows=await query<RowDataPacket[]>(`SELECT v.id,v.version,v.mime_type,v.file_size,v.file_hash,v.is_active,v.created_at,v.revoked_at FROM service_stamp_versions v JOIN service_stamps st ON st.id=v.stamp_id WHERE st.id=? AND ${w.sql} ORDER BY v.version DESC`,[num(r.params.id),...w.p]);
if(!rows.length)throw new HttpError(404,'Cachet introuvable');
res.json(rows.map(sig))}));

documentMarkRouter.patch('/document-marks/stamps/:id/status',requirePermission('stamp.manage'),asyncHandler(async(r,res)=>{if(typeof r.body?.isActive!=='boolean')throw new HttpError(400,'Statut invalide');
const w=scope(r,await assertPermission(r,'stamp.manage'));
await transaction(async c=>{const[x]=await c.execute<RowDataPacket[]>(`SELECT st.id FROM service_stamps st WHERE st.id=? AND ${w.sql} FOR UPDATE`,[num(r.params.id),...w.p]);
if(!x[0])throw new HttpError(404,'Cachet introuvable');
await c.execute('UPDATE service_stamps SET is_active=?,updated_by=? WHERE id=?',[r.body.isActive,r.user!.sub,x[0].id]);
await writeAudit(c,r,{module:'documents',entityType:'service_stamp',entityId:String(x[0].id),action:r.body.isActive?'stamp.activated':'stamp.deactivated',newValues:{isActive:r.body.isActive}})});
res.json({success:true})}));

documentMarkRouter.get('/document-marks/stamps/:stampId/versions/:versionId/image',requirePermission('stamp.view'),asyncHandler(async(r,res)=>{const w=scope(r,await assertPermission(r,'stamp.view')),[x]=await query<RowDataPacket[]>(`SELECT v.file_url,v.mime_type,v.file_hash FROM service_stamp_versions v JOIN service_stamps st ON st.id=v.stamp_id WHERE st.id=? AND v.id=? AND ${w.sql}`,[num(r.params.stampId),num(r.params.versionId),...w.p]);
if(!x)throw new HttpError(404,'Cachet introuvable');
await send(res,x)}));


documentMarkRouter.get('/document-marks/types',requirePermission('stamp.view'),asyncHandler(async(_r,res)=>res.json(documentMarkTypes)));

documentMarkRouter.get('/document-marks/categories',requirePermission('stamp.view'),asyncHandler(async(r,res)=>{const s=await assertPermission(r,'stamp.view');
if(s==='OWN')throw new HttpError(403,'Le scope OWN ne gouverne pas les catégories de cachets');
const[actor]=await query<RowDataPacket[]>('SELECT concession_id FROM agencies WHERE id=?',[r.user!.agencyId]);
if(!actor)throw new HttpError(403,'Agence utilisateur introuvable');
const rows=await query<RowDataPacket[]>(`SELECT c.*,EXISTS(SELECT 1 FROM service_stamps st WHERE st.category_id=c.id) is_used FROM service_stamp_categories c WHERE ${s==='GLOBAL'?'1=1':'c.concession_id=?'} ORDER BY c.name`,s==='GLOBAL'?[]:[actor.concession_id]);
res.json(rows.map(x=>({...x,id:String(x.id),concession_id:String(x.concession_id),is_active:Boolean(x.is_active),is_used:Boolean(x.is_used)})))}));

documentMarkRouter.post('/document-marks/categories',requirePermission('stamp.manage'),asyncHandler(async(r,res)=>{const s=await assertPermission(r,'stamp.manage'),concession=await target(r,s,null,null),name=txt(r.body.name,120);
if(!name)throw new HttpError(400,'Nom requis');
try{const result=await execute('INSERT INTO service_stamp_categories(concession_id,name,description,created_by) VALUES(?,?,?,?)',[concession,name,txt(r.body.description,500)||null,r.user!.sub]);
res.status(201).json({id:String(result.insertId)})}catch(e:any){if(e?.code==='ER_DUP_ENTRY')throw new HttpError(409,'Cette catégorie existe déjà');
throw e}}));

documentMarkRouter.patch('/document-marks/categories/:id',requirePermission('stamp.manage'),asyncHandler(async(r,res)=>{const s=await assertPermission(r,'stamp.manage'),concession=await target(r,s,null,null),name=txt(r.body.name,120);
if(!name||typeof r.body.isActive!=='boolean')throw new HttpError(400,'Catégorie invalide');
try{const result=await execute('UPDATE service_stamp_categories SET name=?,description=?,is_active=?,updated_by=? WHERE id=? AND concession_id=?',[name,txt(r.body.description,500)||null,r.body.isActive,r.user!.sub,num(r.params.id),concession]);
if(!result.affectedRows)throw new HttpError(404,'Catégorie introuvable');
res.json({success:true})}catch(e:any){if(e?.code==='ER_DUP_ENTRY')throw new HttpError(409,'Cette catégorie existe déjà');
throw e}}));


documentMarkRouter.get('/document-marks/policies',requirePermission('stamp.view'),asyncHandler(async(r,res)=>{const w=scope(r,await assertPermission(r,'stamp.view')),rows=await query<RowDataPacket[]>(`SELECT p.*,st.name default_stamp_name FROM document_mark_policies p LEFT JOIN service_stamps st ON st.id=p.default_stamp_id WHERE ${w.sql.replaceAll('st.','p.')} ORDER BY p.document_type,p.agency_id IS NULL,p.agency_id`,w.p);
res.json(rows.map(x=>({...x,id:String(x.id),concession_id:String(x.concession_id),agency_id:x.agency_id?String(x.agency_id):null,default_stamp_id:x.default_stamp_id?String(x.default_stamp_id):null,signature_required:Boolean(x.signature_required),stamp_required:Boolean(x.stamp_required),is_active:Boolean(x.is_active)})))}));

documentMarkRouter.put('/document-marks/policies/:documentType',requirePermission('stamp.manage'),asyncHandler(async(r,res)=>{const s=await assertPermission(r,'stamp.manage'),type=documentType(r.params.documentType),agencyId=txt(r.body.agencyId)?num(r.body.agencyId):null,concession=await target(r,s,agencyId,null),definition=documentMarkTypes.find(x=>x.code===type)!;
if(!definition.policyManaged)throw new HttpError(409,'Ce document utilise un workflow de marques explicite et ne peut pas recevoir de politique automatique');
const signature=Boolean(r.body.signatureRequired),stamp=Boolean(r.body.stampRequired),behavior=r.body.missingMarkBehavior==='ALLOW_WITHOUT_MARK'?'ALLOW_WITHOUT_MARK':'BLOCK',defaultStamp=txt(r.body.defaultStampId)?num(r.body.defaultStampId):null;
if(defaultStamp){const[allowed]=await query<RowDataPacket[]>('SELECT st.id FROM service_stamps st JOIN service_stamp_document_types dt ON dt.stamp_id=st.id AND dt.document_type=? WHERE st.id=? AND st.concession_id=? AND st.is_active=TRUE AND st.revoked_at IS NULL',[type,defaultStamp,concession]);
if(!allowed)throw new HttpError(400,'Cachet par défaut incompatible, inactif ou révoqué')}const saved=await transaction(async c=>{const[before]=await c.execute<RowDataPacket[]>('SELECT * FROM document_mark_policies WHERE concession_id=? AND agency_scope_key=COALESCE(?,0) AND document_type=? FOR UPDATE',[concession,agencyId,type]);
await c.execute('INSERT INTO document_mark_policies(concession_id,agency_id,document_type,trigger_status,signature_required,stamp_required,missing_mark_behavior,default_stamp_id,is_active,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE trigger_status=VALUES(trigger_status),signature_required=VALUES(signature_required),stamp_required=VALUES(stamp_required),missing_mark_behavior=VALUES(missing_mark_behavior),default_stamp_id=VALUES(default_stamp_id),is_active=VALUES(is_active),updated_by=VALUES(updated_by)',[concession,agencyId,type,definition.triggerStatus,signature,stamp,behavior,defaultStamp,r.body.isActive!==false,r.user!.sub,r.user!.sub]);
const[rows]=await c.execute<RowDataPacket[]>('SELECT * FROM document_mark_policies WHERE concession_id=? AND agency_scope_key=COALESCE(?,0) AND document_type=?',[concession,agencyId,type]);
const row=rows[0]!;
await writeAudit(c,r,{module:'documents',entityType:'document_mark_policy',entityId:String(row.id),action:before[0]?'document.mark_policy.updated':'document.mark_policy.created',oldValues:before[0]??null,newValues:{documentType:type,agencyId,signatureRequired:signature,stampRequired:stamp,missingMarkBehavior:behavior,defaultStampId:defaultStamp,isActive:r.body.isActive!==false}});
return row});
res.json({...saved,id:String(saved.id),concession_id:String(saved.concession_id),agency_id:saved.agency_id?String(saved.agency_id):null,default_stamp_id:saved.default_stamp_id?String(saved.default_stamp_id):null,signature_required:Boolean(saved.signature_required),stamp_required:Boolean(saved.stamp_required),is_active:Boolean(saved.is_active)})}));


documentMarkRouter.get('/roles/:roleId/stamps',requirePermission('stamp.view'),asyncHandler(async(r,res)=>{const roleId=num(r.params.roleId),w=scope(r,await assertPermission(r,'stamp.view')),rows=await query<RowDataPacket[]>(`SELECT st.id,st.name,st.document_context,st.is_active,c.name category_name,(SELECT JSON_ARRAYAGG(dt.document_type) FROM service_stamp_document_types dt WHERE dt.stamp_id=st.id) document_contexts,EXISTS(SELECT 1 FROM service_stamp_role_authorizations a WHERE a.stamp_id=st.id AND a.role_id=?) authorized FROM service_stamps st LEFT JOIN service_stamp_categories c ON c.id=st.category_id WHERE ${w.sql} ORDER BY st.name`,[roleId,...w.p]);
res.json(rows.map(x=>({...x,id:String(x.id),document_contexts:contexts(x.document_contexts,String(x.document_context)),is_active:Boolean(x.is_active),authorized:Boolean(x.authorized)})))}));

documentMarkRouter.put('/roles/:roleId/stamps',requirePermission('stamp.manage'),asyncHandler(async(r,res)=>{const roleId=num(r.params.roleId),w=scope(r,await assertPermission(r,'stamp.manage')),ids:string[]=Array.isArray(r.body.stampIds)?[...new Set<string>(r.body.stampIds.map((x:unknown)=>num(x)))]:[];
await transaction(async c=>{const[role]=await c.execute<RowDataPacket[]>('SELECT id FROM roles WHERE id=? AND is_active=TRUE FOR UPDATE',[roleId]);
if(!role[0])throw new HttpError(404,'Rôle actif introuvable');
if(ids.length){const[valid]=await c.execute<RowDataPacket[]>(`SELECT st.id FROM service_stamps st WHERE st.id IN (${ids.map(()=>'?').join(',')}) AND st.is_active=TRUE AND st.revoked_at IS NULL AND ${w.sql}`,[...ids,...w.p]);
if(valid.length!==ids.length)throw new HttpError(400,'Cachet introuvable, inactif ou révoqué dans votre périmètre')}await c.execute(`DELETE a FROM service_stamp_role_authorizations a JOIN service_stamps st ON st.id=a.stamp_id WHERE a.role_id=? AND ${w.sql}`,[roleId,...w.p]);
for(const stampId of ids)await c.execute('INSERT INTO service_stamp_role_authorizations(stamp_id,role_id,created_by) VALUES(?,?,?)',[stampId,roleId,r.user!.sub]);
await writeAudit(c,r,{module:'documents',entityType:'role_stamp_authorization',entityId:roleId,action:'role.stamps.updated',newValues:{stampIds:ids}})});
res.json({success:true})}));
