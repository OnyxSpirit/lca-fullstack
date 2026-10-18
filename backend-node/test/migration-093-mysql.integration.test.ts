import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import test from 'node:test';
import mysql,{type RowDataPacket} from 'mysql2/promise';

const enabled=process.env.MIGRATION_093_MYSQL_TEST==='1';

test('MIG093 — MySQL 8.4 préserve les emplacements, index et clés étrangères',{skip:!enabled,timeout:120_000},async()=>{
  const schema=`lca_migration_093_${process.pid}`;
  const admin=await mysql.createConnection({host:process.env.MIGRATION_DB_HOST??'127.0.0.1',port:Number(process.env.MIGRATION_DB_PORT??3306),user:process.env.MIGRATION_DB_USER??'root',password:process.env.MIGRATION_DB_PASSWORD??'',multipleStatements:true});
  try{
    await admin.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;USE \`${schema}\`;CREATE TABLE agencies(id BIGINT UNSIGNED PRIMARY KEY);CREATE TABLE users(id BIGINT UNSIGNED PRIMARY KEY);CREATE TABLE vehicle_locations(id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,agency_id BIGINT UNSIGNED NOT NULL,name VARCHAR(120) NOT NULL,type ENUM('PARC','SHOWROOM') NOT NULL,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_by BIGINT UNSIGNED NOT NULL,UNIQUE KEY uq_vehicle_location(agency_id,type,name),KEY idx_vehicle_location_agency(agency_id,type,is_active),CONSTRAINT fk_vehicle_location_agency FOREIGN KEY(agency_id) REFERENCES agencies(id),CONSTRAINT fk_vehicle_location_creator FOREIGN KEY(created_by) REFERENCES users(id));INSERT INTO agencies VALUES(1);INSERT INTO users VALUES(1);INSERT INTO vehicle_locations(agency_id,name,type,created_by) VALUES(1,'Parc historique','PARC',1),(1,'Showroom historique','SHOWROOM',1)`);
    const sql=await readFile(resolve(import.meta.dirname,'../database/migrations/093_vehicle_location_garages.sql'),'utf8');
    await admin.query(sql);
    await admin.query("INSERT INTO vehicle_locations(agency_id,name,type,created_by) VALUES(1,'Garage central','GARAGE',1)");
    const[rows]=await admin.query<RowDataPacket[]>('SELECT name,type FROM vehicle_locations ORDER BY id');
    assert.deepEqual(rows.map(row=>[row.name,row.type]),[['Parc historique','PARC'],['Showroom historique','SHOWROOM'],['Garage central','GARAGE']]);
    const[column]=await admin.query<RowDataPacket[]>("SELECT column_type FROM information_schema.columns WHERE table_schema=? AND table_name='vehicle_locations' AND column_name='type'",[schema]);
    assert.equal(String(column[0]!.COLUMN_TYPE??column[0]!.column_type),"enum('PARC','SHOWROOM','GARAGE')");
    const[indexes]=await admin.query<RowDataPacket[]>("SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema=? AND table_name='vehicle_locations' AND index_name IN('uq_vehicle_location','idx_vehicle_location_agency')",[schema]);
    assert.equal(indexes.length,2);
    const[fks]=await admin.query<RowDataPacket[]>("SELECT constraint_name FROM information_schema.table_constraints WHERE constraint_schema=? AND table_name='vehicle_locations' AND constraint_type='FOREIGN KEY'",[schema]);
    assert.equal(fks.length,2);
  }finally{await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);await admin.end()}
});
