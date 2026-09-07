import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import { CUSTOMERS_360_SCHEMA,migrateCustomers360,type SchemaDatabase } from '../src/scripts/migrate-customers-360.js';

class FakeSchema implements SchemaDatabase{
  contacts=false;columns=new Set(Object.entries(CUSTOMERS_360_SCHEMA).flatMap(([table,names])=>names.filter(name=>!['customer_contacts.customer_id','opportunities.customer_id','activities.customer_id'].includes(`${table}.${name}`)).map(name=>`${table}.${name}`)));indexes=new Set<string>();constraints=new Set<string>();ddl:string[]=[];
  async query<T extends RowDataPacket[]>(sql:string,params:unknown[]=[]):Promise<[T,unknown]>{
    if(sql.includes('information_schema.TABLES'))return [[...(this.contacts?[{1:1}]:[])] as T,undefined];
    if(sql.includes('information_schema.COLUMNS')&&sql.includes('COLUMN_NAME=?'))return [[...(this.columns.has(`${params[0]}.${params[1]}`)?[{1:1}]:[])] as T,undefined];
    if(sql.includes('information_schema.STATISTICS'))return [[...(this.indexes.has(String(params[1]))?[{1:1}]:[])] as T,undefined];
    if(sql.includes('information_schema.REFERENTIAL_CONSTRAINTS'))return [[...(this.constraints.has(String(params[1]))?[{1:1}]:[])] as T,undefined];
    if(sql.includes('information_schema.COLUMNS'))return [[...this.columns].map(value=>{const[table,column]=value.split('.');return{TABLE_NAME:table,COLUMN_NAME:column}}) as T,undefined];
    this.ddl.push(sql);
    if(sql.startsWith('CREATE TABLE customer_contacts')){this.contacts=true;for(const name of CUSTOMERS_360_SCHEMA.customer_contacts)this.columns.add(`customer_contacts.${name}`);this.indexes.add('idx_customer_contacts_customer');this.constraints.add('fk_customer_contact_customer');}
    if(sql.includes('opportunities ADD COLUMN'))this.columns.add('opportunities.customer_id');
    if(sql.includes('activities ADD COLUMN'))this.columns.add('activities.customer_id');
    for(const name of ['idx_opportunity_customer','idx_activity_customer'])if(sql.includes(name))this.indexes.add(name);
    for(const name of ['fk_opportunity_customer','fk_activity_customer'])if(sql.includes(name))this.constraints.add(name);
    return [[] as T,undefined];
  }
}

test('le migrateur Client 360 applique les écarts puis devient sans effet',async()=>{const db=new FakeSchema();const first=await migrateCustomers360(db);assert.deepEqual(first,['table customer_contacts','colonne opportunities.customer_id','index idx_opportunity_customer','clé fk_opportunity_customer','colonne activities.customer_id','index idx_activity_customer','clé fk_activity_customer']);const ddlCount=db.ddl.length;const second=await migrateCustomers360(db);assert.deepEqual(second,[]);assert.equal(db.ddl.length,ddlCount);assert.ok(db.ddl.every(sql=>!/^\s*(DROP|TRUNCATE|DELETE)/i.test(sql)))});
