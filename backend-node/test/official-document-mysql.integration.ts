import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';
import{writeFile,mkdir}from'node:fs/promises';
import jwt from'jsonwebtoken';
import mysql from'mysql2/promise';

const database=process.env.DB_NAME??process.env.MYSQL_DATABASE;
assert.equal(database,'lca_recette','Ce test refuse toute base autre que lca_recette');
const base=process.env.RECETTE_API_URL??'http://127.0.0.1:3004/api',output=process.env.RECETTE_PDF_DIR??'/tmp/lca-documentaire-pdf';
const connection=await mysql.createConnection({host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??33321),user:process.env.DB_USER??process.env.MYSQL_USER,password:process.env.DB_PASSWORD??process.env.MYSQL_PASSWORD,database});
const[[identity]]=await connection.query<any[]>('SELECT DATABASE() name,@@port port');
assert.equal(identity.name,'lca_recette');
const sessionId=randomUUID(),expires=new Date(Date.now()+60*60*1000);
await connection.execute(`INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at,active_agency_id,two_factor_verified_at,strong_auth_at,strong_auth_method,two_factor_grandfathered) VALUES(?,1,?, ?,1,NOW(),NOW(),'PASSWORD_TOTP',FALSE)`,[sessionId,'integration-documentaire',expires]);
const token=jwt.sign({sub:'1',email:'recette.admin@lca-test.cg',roles:['SUPER_ADMIN'],agencyId:'1',sid:sessionId},process.env.JWT_ACCESS_SECRET!,{algorithm:'HS256',expiresIn:'1h'}),headers={Authorization:`Bearer ${token}`};
const documents=[
 ['ABS-001','/leads/9001/official-pdf'],['ABS-002','/customers/9001/official-pdf'],['ABS-003','/showroom/9001/visit-pdf'],['ABS-004','/showroom/test-drives/9001/pdf'],['ABS-005','/vehicles/inventory/pdf'],['ABS-006','/vehicle-movements/9001/pdf'],['ABS-007','/payment-refunds/9001/pdf'],['ABS-008-facture','/invoices/9001/cancellation-pdf'],['ABS-008-vente','/sales/9001/cancellation-pdf'],['ABS-008-paiement','/payments/9001/cancellation-pdf'],['ABS-009','/repair-orders/9001/diagnostic-pdf'],['ABS-010','/repair-orders/9001/quality-control-pdf'],['ABS-011','/repair-orders/9001/handover-pdf'],['ABS-012','/parts-internal-requests/9001/pdf'],['ABS-013-commande','/parts/purchase-orders/9001/pdf'],['ABS-013-reception','/parts/purchase-receipts/9001/pdf'],['ABS-014','/parts/movements/9001/pdf'],['ABS-015','/parts/inventory/pdf'],['ABS-016','/accounting/journals/9001/pdf?from=2026-01-01&to=2026-12-31'],['ABS-017','/accounting/entries/9001/pdf'],['ABS-018','/treasury/bank-statements/9001/pdf'],
]as const;
await mkdir(output,{recursive:true});
const results:Record<string,unknown>[]=[];
try{
 const anonymous=await fetch(base+'/vehicles/inventory/pdf');assert.equal(anonymous.status,401);
 for(const[id,path]of documents){const response=await fetch(base+path,{headers}),buffer=Buffer.from(await response.arrayBuffer());results.push({id,path,status:response.status,type:response.headers.get('content-type'),bytes:buffer.length});assert.equal(response.status,200,`${id} ${path}: ${buffer.toString('utf8',0,300)}`);assert.equal(response.headers.get('content-type'),'application/pdf');assert.equal(buffer.subarray(0,4).toString(),'%PDF');await writeFile(`${output}/${id}.pdf`,buffer)}
 await connection.execute('UPDATE refresh_tokens SET active_agency_id=9002,agency_context_version=agency_context_version+1 WHERE id=?',[sessionId]);
 const forbidden=await fetch(base+'/customers/9001/official-pdf',{headers});assert.equal(forbidden.status,404);
 console.log(JSON.stringify({database:identity.name,port:identity.port,anonymousStatus:anonymous.status,crossAgencyStatus:forbidden.status,documents:results},null,2));
}finally{await connection.execute('DELETE FROM refresh_tokens WHERE id=?',[sessionId]);await connection.end()}
