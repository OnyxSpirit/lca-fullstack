import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {after,test} from 'node:test';
import mysql from 'mysql2/promise';
import type {Request,Response} from 'express';
import {documentMultipart,type MultipartRequest} from '../src/modules/documents/document-multipart.js';
import {MAX_DOCUMENT_SIZE} from '../src/modules/documents/document-storage.js';

const enabled=process.env.LCA_RESERVES_TEST==='1';
const pools:Array<ReturnType<typeof mysql.createPool>>=[];
if(enabled)after(async()=>{for(const pool of pools)await pool.end()});

test('AUD-LCA-013 : pool 2 + file 2 refuse la cinquième requête et rollback une transaction',{skip:!enabled,timeout:5000},async()=>{
  const pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:2,queueLimit:2,connectTimeout:1000});pools.push(pool);
  const started=Date.now(),results=await Promise.allSettled(Array.from({length:5},()=>pool.query('SELECT SLEEP(0.25)'))),elapsed=Date.now()-started;
  assert.equal(results.filter(x=>x.status==='fulfilled').length,4);assert.equal(results.filter(x=>x.status==='rejected').length,1);assert.ok(elapsed<1500,`durée non bornée: ${elapsed} ms`);
  const connection=await pool.getConnection();try{await connection.beginTransaction();await connection.query('CREATE TEMPORARY TABLE closeqa_rollback(id INT)');await connection.query('INSERT INTO closeqa_rollback VALUES(1)');await connection.rollback();const[rows]=await connection.query<mysql.RowDataPacket[]>('SELECT COUNT(*) total FROM closeqa_rollback');assert.equal(Number(rows[0]!.total),0)}finally{connection.release()}
});

function multipart(size:number){const boundary='----closeqa-boundary',head=Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),file=Buffer.alloc(size,0x20),tail=Buffer.from(`\r\n--${boundary}--\r\n`);file.write('%PDF-',0);return{boundary,body:Buffer.concat([head,file,tail])}}
async function parse(size:number){const{boundary,body}=multipart(size),stream=Readable.from(Array.from({length:Math.ceil(body.length/65536)},(_,i)=>body.subarray(i*65536,Math.min(body.length,(i+1)*65536)))) as MultipartRequest;stream.headers={'content-type':`multipart/form-data; boundary=${boundary}`} as Request['headers'];let failure:unknown;await documentMultipart(stream,{} as Response,error=>{failure=error});return{failure,file:stream.documentFile}}

test('AUD-LCA-014 : deux uploads de 15 Mio restent bornés et le dépassement est rejeté 413',{skip:!enabled,timeout:5000},async()=>{
  const before=process.memoryUsage().rss,[a,b]=await Promise.all([parse(MAX_DOCUMENT_SIZE),parse(MAX_DOCUMENT_SIZE)]),delta=process.memoryUsage().rss-before;
  assert.equal(a.failure,undefined);assert.equal(b.failure,undefined);assert.equal(a.file?.buffer.length,MAX_DOCUMENT_SIZE);assert.equal(b.file?.buffer.length,MAX_DOCUMENT_SIZE);
  assert.ok(delta<160*1024*1024,`surconsommation RSS non bornée: ${Math.round(delta/1024/1024)} Mio`);
  const oversize=await parse(MAX_DOCUMENT_SIZE+128*1024);assert.equal((oversize.failure as {status?:number})?.status,413);
  console.log(JSON.stringify({uploads:2,bytesPerUpload:MAX_DOCUMENT_SIZE,rssDeltaMiB:Math.round(delta/1024/1024),oversizeStatus:(oversize.failure as {status?:number})?.status}));
});
