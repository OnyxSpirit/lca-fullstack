import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import ExcelJS from 'exceljs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const database=process.env.DB_NAME??process.env.MYSQL_DATABASE;
assert.equal(database,'lca_recette','Ce test refuse toute base autre que lca_recette');
const base=process.env.RECETTE_API_URL??'http://127.0.0.1:3004/api';
const connection=await mysql.createConnection({host:process.env.DB_HOST??'127.0.0.1',port:Number(process.env.DB_PORT??33321),user:process.env.DB_USER??process.env.MYSQL_USER,password:process.env.DB_PASSWORD??process.env.MYSQL_PASSWORD,database});
const[[identity]]=await connection.query<any[]>('SELECT DATABASE() name');assert.equal(identity.name,'lca_recette');
const sessionId=randomUUID();await connection.execute(`INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at,active_agency_id,two_factor_verified_at,strong_auth_at,strong_auth_method,two_factor_grandfathered) VALUES(?,1,?,DATE_ADD(NOW(),INTERVAL 1 HOUR),1,NOW(),NOW(),'PASSWORD_TOTP',FALSE)`,[sessionId,'integration-exports']);
const token=jwt.sign({sub:'1',email:'recette.admin@lca-test.cg',roles:['SUPER_ADMIN'],agencyId:'1',sid:sessionId},process.env.JWT_ACCESS_SECRET!,{algorithm:'HS256',expiresIn:'1h'}),headers={Authorization:`Bearer ${token}`},period='from=2026-01-01&to=2026-12-31';
const xlsx=[
 ['DOC-023','/accounting/accounts/export/xlsx'],['DOC-024','/accounting/entries/export/xlsx?'+period],['DOC-025','/accounting/advanced/export/ledger/xlsx?'+period],['DOC-026','/accounting/advanced/export/balance/xlsx?'+period],['DOC-027','/reports/financial-dashboard/export/xlsx?mode=summary&'+period],['DOC-028','/reports/financial-dashboard/export/xlsx?mode=detailed&'+period],
]as const;
const csv=[
 ['DOC-029','/invoices/export/accounting?'+period],['DOC-030','/treasury/journal/export?'+period],['DOC-031','/treasury/bank-statements/9001/export'],['DOC-032','/accounting/accounts/export/csv'],['DOC-033','/accounting/entries/export/csv?'+period],['DOC-034','/accounting/advanced/export/ledger/csv?'+period],['DOC-035','/accounting/advanced/export/balance/csv?'+period],['DOC-036','/reports/financial-dashboard/export/csv?mode=summary&'+period],['DOC-037','/reports/financial-dashboard/export/csv?mode=detailed&'+period],['DOC-038','/reports/financial-export/treasury?'+period],['DOC-039','/reports/financial-export/customers?'+period],['DOC-040','/reports/financial-export/budgets?'+period],['DOC-041','/reports/financial-export/suppliers?'+period],['DOC-042','/reports/financial-export/remunerations?'+period],['DOC-043','/reports/financial-export/coverage?'+period],['DOC-044','/reports/export?section=overview&'+period],['DOC-045','/reports/export?section=sales&'+period],['DOC-046','/reports/export?section=finance&'+period],['DOC-047','/reports/export?section=vehicles&'+period],['DOC-048','/reports/export?section=workshop&'+period],['DOC-049','/reports/export?section=parts&'+period],
]as const;
const results:any[]=[];
try{
 for(const[id,path]of xlsx){const response=await fetch(base+path,{headers}),buffer=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,`${id}: ${buffer.toString('utf8',0,300)}`);assert.match(response.headers.get('content-type')??'',/spreadsheetml/,id);const book=new ExcelJS.Workbook();await book.xlsx.load(buffer as any);assert.equal(book.worksheets.length,1,id);const sheet=book.worksheets[0]!;assert.ok(sheet.name.trim(),id);assert.ok(sheet.rowCount>=1,id);assert.ok(sheet.columnCount>=1,id);assert.ok(sheet.autoFilter,id);let styledHeader=false;sheet.eachRow(row=>{if(row.getCell(1).font?.bold)styledHeader=true});assert.equal(styledHeader,true,id);assert.ok(sheet.views.some(x=>x.state==='frozen'),id);results.push({id,format:'XLSX',sheet:sheet.name,rows:sheet.rowCount,columns:sheet.columnCount,bytes:buffer.length})}
 for(const[id,path]of csv){const response=await fetch(base+path,{headers}),buffer=Buffer.from(await response.arrayBuffer());assert.equal(response.status,200,`${id}: ${buffer.toString('utf8',0,300)}`);assert.match(response.headers.get('content-type')??'',/text\/csv/);const text=buffer.toString('utf8');assert.ok(text.startsWith('\ufeff'));assert.ok(text.includes(';'));assert.ok(text.includes('\r\n'));assert.doesNotMatch(text,/(?:^|;|\r\n)"?[=+@][^";\r\n]*/);results.push({id,format:'CSV',rows:text.split('\r\n').filter(Boolean).length,bytes:buffer.length})}
 console.log(JSON.stringify({database:identity.name,xlsx:xlsx.length,csv:csv.length,results},null,2));
}finally{await connection.execute('DELETE FROM refresh_tokens WHERE id=?',[sessionId]);await connection.end()}
