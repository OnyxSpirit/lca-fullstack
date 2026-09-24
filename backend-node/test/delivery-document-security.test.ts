import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {after,before,test} from 'node:test';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';

const root=await mkdtemp(path.join(os.tmpdir(),'lca-delivery-doc-'));
process.env.GED_STORAGE_DIR=path.join(root,'private');
process.env.UPLOAD_DIR=path.join(root,'public');

const [{createApp},{env},{pool},{decodeDeliveryDocument,MAX_DELIVERY_DOCUMENT_SIZE},{resolveDocumentPath,storeDocument}]=await Promise.all([
  import('../src/app.js'),import('../src/config/env.js'),import('../src/config/database.js'),
  import('../src/modules/deliveries/delivery-document.js'),import('../src/modules/documents/document-storage.js'),
]);

type Actor={permissions:Record<string,'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL'>;allow:boolean;code?:string;system?:boolean};
const actors:Record<string,Actor>={
  none:{permissions:{},allow:false},agency:{permissions:{'delivery.documents.view':'AGENCY'},allow:true},
  denied:{permissions:{'delivery.documents.view':'AGENCY'},allow:false},concession:{permissions:{'delivery.documents.view':'CONCESSION'},allow:true},
  global:{permissions:{'delivery.documents.view':'GLOBAL'},allow:true},fake:{permissions:{},allow:false,code:'SUPER_ADMIN',system:false},
  system:{permissions:{},allow:true,code:'SUPER_ADMIN',system:true},manageDenied:{permissions:{'delivery.checklist.manage':'AGENCY'},allow:false},
};
const token=(sub:string)=>jwt.sign({sub,email:`${sub}@test.local`,roles:[],agencyId:'1'},env.jwt.accessSecret,{expiresIn:'5m'});
const original=pool.execute.bind(pool);

before(async()=>{
  await mkdir(path.join(process.env.GED_STORAGE_DIR!,'agency'),{recursive:true});
  await writeFile(path.join(process.env.GED_STORAGE_DIR!,'agency','delivery.pdf'),Buffer.from('%PDF-1.4\n%%EOF'));
  (pool as any).execute=async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('FROM users WHERE id=? AND is_active=TRUE'))return[[{id:params[0],agency_id:String(params[0])}],[]];
    if(sql.includes('FROM users u JOIN user_roles')){const actor=actors[String(params[0])]!;return[[{id:`role-${params[0]}`,code:actor.code??'CUSTOM',is_system:Boolean(actor.system)}],[]]}
    if(sql.includes('FROM role_permissions')){const sub=String(params[0]).replace(/^role-/,'');return[Object.entries(actors[sub]!.permissions).map(([code,scope])=>({code,scope})),[]]}
    if(sql.includes('FROM delivery_documents')&&sql.includes('delivery_id=?')){const[documentId,deliveryId]=params.map(String);if(documentId==='1'&&deliveryId==='10')return[[{id:'1',delivery_id:'10',document_name:'Bon de remise',document_url:'ged:agency/delivery.pdf',file_name:'remise.pdf',mime_type:'application/pdf'}],[]];if(documentId==='3'&&deliveryId==='10')return[[{id:'3',delivery_id:'10',document_name:'Absent',document_url:'ged:agency/missing.pdf',file_name:'absent.pdf',mime_type:'application/pdf'}],[]];return[[],[]]}
    if(sql.includes('SELECT d.id FROM deliveries d'))return params.length===1||actors[String(params.at(-1))]!.allow?[[{id:params[0]}],[]]:[[],[]];
    if(sql.includes('FROM deliveries d JOIN sales'))return[[],[]];
    return[[],[]];
  };
});
after(async()=>{(pool as any).execute=original;await rm(root,{recursive:true,force:true})});

test('D1/D2 les URL statique et API sans JWT restent inaccessibles',async()=>{
  assert.equal((await supertest(createApp()).get('/uploads/deliveries/10/delivery.pdf')).status,404);
  assert.equal((await supertest(createApp()).get('/api/deliveries/10/documents/1/download')).status,401);
  assert.equal((await supertest(createApp()).get('/api/deliveries/10/documents/1/download').set('Authorization','Bearer invalide')).status,401);
});

test('D3-D10 permissions, scopes, Super Admin système et anti-IDOR',async()=>{
  const get=(sub:string,url='/api/deliveries/10/documents/1/download')=>supertest(createApp()).get(url).set('Authorization',`Bearer ${token(sub)}`);
  assert.equal((await get('none')).status,403);
  assert.equal((await get('denied')).status,404);
  for(const sub of ['agency','concession','global','system']){const response=await get(sub);assert.equal(response.status,200,sub);assert.equal(response.headers['content-type'],'application/pdf');assert.match(response.headers['content-disposition'],/^attachment;/);assert.equal(response.headers['x-content-type-options'],'nosniff');assert.equal(response.headers['cache-control'],'private, no-store')}
  assert.equal((await get('fake')).status,403);
  assert.equal((await get('agency','/api/deliveries/10/documents/2/download')).status,404);
  assert.equal((await get('agency','/api/deliveries/20/documents/1/download')).status,404);
});

test('D11/D12 traversal et fichier manquant sont refusés proprement',async()=>{
  assert.throws(()=>resolveDocumentPath('ged:../../etc/passwd'));
  assert.throws(()=>resolveDocumentPath('/uploads/deliveries/../../etc/passwd'));
  const response=await supertest(createApp()).get('/api/deliveries/10/documents/3/download').set('Authorization',`Bearer ${token('agency')}`);
  assert.equal(response.status,410);assert.doesNotMatch(JSON.stringify(response.body),/stack|ENOENT/i);
});

const encoded=(buffer:Buffer)=>buffer.toString('base64');
test('U1-U6 contenu réel PDF/PNG/JPEG, types interdits et limite',()=>{
  assert.equal(decodeDeliveryDocument(encoded(Buffer.from('%PDF-1.4\n%%EOF')),'vrai.pdf','application/pdf').mimeType,'application/pdf');
  assert.throws(()=>decodeDeliveryDocument(encoded(Buffer.from('texte')),'faux.pdf','application/pdf'));
  assert.equal(decodeDeliveryDocument(encoded(Buffer.from([137,80,78,71,13,10,26,10])),'vrai.png','image/png').mimeType,'image/png');
  assert.throws(()=>decodeDeliveryDocument(encoded(Buffer.from('not png')),'faux.png','image/png'));
  assert.throws(()=>decodeDeliveryDocument(encoded(Buffer.from('texte')),'note.txt','text/plain'));
  assert.throws(()=>decodeDeliveryDocument(encoded(Buffer.alloc(MAX_DELIVERY_DOCUMENT_SIZE+1)),'trop-grand.pdf','application/pdf'),error=>Boolean(error&&typeof error==='object'&&'status'in error&&error.status===413));
});

test('U7/U8 les noms traversal, Unicode et double extension n’influencent pas le chemin physique',async()=>{
  for(const name of ['../../facture.pdf','<script>é.pdf','archive.exe.pdf']){const stored=await storeDocument(decodeDeliveryDocument(encoded(Buffer.from('%PDF-1.4\n%%EOF')),name,'application/pdf'),'agency');assert.ok(stored.absolute.startsWith(path.resolve(process.env.GED_STORAGE_DIR!)+path.sep));assert.doesNotMatch(path.basename(stored.absolute),/facture|script|archive|\.exe/i)}
});

test('U9/U10 permission absente et scope upload incorrect sont refusés avant persistance',async()=>{
  const body={documentName:'Test',fileName:'test.pdf',mimeType:'application/pdf',dataBase64:encoded(Buffer.from('%PDF-1.4\n%%EOF'))};
  const none=await supertest(createApp()).post('/api/deliveries/10/documents').set('Authorization',`Bearer ${token('none')}`).send(body);
  assert.equal(none.status,403);
  const denied=await supertest(createApp()).post('/api/deliveries/10/documents').set('Authorization',`Bearer ${token('manageDenied')}`).send(body);
  assert.equal(denied.status,404);
});
