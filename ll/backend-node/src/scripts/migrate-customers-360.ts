import { pathToFileURL } from 'node:url';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';

export interface SchemaDatabase {
  query<T extends RowDataPacket[]>(sql:string,params?:unknown[]):Promise<[T,unknown]>;
}

export const CUSTOMERS_360_SCHEMA:Record<string,string[]>={
  customers:['id','customer_code','agency_id','created_at'],
  customer_contacts:['id','customer_id','first_name','last_name','role_title','email','phone','is_primary','created_at'],
  opportunities:['id','lead_id','customer_id','title','stage','expected_value','probability','expected_close_date','lost_reason','created_at','updated_at'],
  leads:['id','customer_id'],
  vehicles:['id','vin','registration_number','year','mileage','status','agency_id','version_id','updated_at'],
  versions:['id','model_id','name'],models:['id','brand_id','name'],brands:['id','name'],
  sale_items:['sale_id','vehicle_id'],sales:['id','sale_number','customer_id','agency_id','status','total','balance_due','created_at'],
  repair_orders:['id','order_number','customer_id','vehicle_id','agency_id','status','complaint','actual_total','created_at'],
  invoices:['id','invoice_number','customer_id','agency_id','status','issue_date','due_date','total','amount_paid','balance_due','invoice_type','created_at'],
  activities:['id','customer_id','subject','description','created_at'],
  deliveries:['id','delivery_number','customer_id','status','customer_notes','created_at'],
  payments:['id','payment_number','customer_id','status','amount','payment_date'],
  showroom_visits:['id','customer_id','status','reason','arrival_at'],
  documents:['id','entity_type','entity_id','file_name','document_type','is_archived','created_at'],
};

const exists=async(db:SchemaDatabase,kind:'COLUMNS'|'STATISTICS'|'REFERENTIAL_CONSTRAINTS',table:string,name:string)=>{
  const nameColumn=kind==='COLUMNS'?'COLUMN_NAME':kind==='STATISTICS'?'INDEX_NAME':'CONSTRAINT_NAME';
  const[rows]=await db.query<RowDataPacket[]>(`SELECT 1 FROM information_schema.${kind} WHERE ${kind==='REFERENTIAL_CONSTRAINTS'?'CONSTRAINT_SCHEMA':'TABLE_SCHEMA'}=DATABASE() AND TABLE_NAME=? AND ${nameColumn}=? LIMIT 1`,[table,name]);
  return rows.length>0;
};

export async function migrateCustomers360(db:SchemaDatabase=pool):Promise<string[]>{
  const applied:string[]=[];
  const[contacts]=await db.query<RowDataPacket[]>("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='customer_contacts' LIMIT 1");
  if(!contacts.length){await db.query<RowDataPacket[]>(`CREATE TABLE customer_contacts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,customer_id BIGINT UNSIGNED NOT NULL,first_name VARCHAR(100) NOT NULL,last_name VARCHAR(100) NOT NULL,role_title VARCHAR(120) NULL,email VARCHAR(190) NULL,phone VARCHAR(50) NULL,is_primary BOOLEAN NOT NULL DEFAULT FALSE,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX idx_customer_contacts_customer(customer_id),CONSTRAINT fk_customer_contact_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB`);applied.push('table customer_contacts');}
  if(!await exists(db,'COLUMNS','opportunities','customer_id')){await db.query<RowDataPacket[]>('ALTER TABLE opportunities ADD COLUMN customer_id BIGINT UNSIGNED NULL AFTER lead_id');applied.push('colonne opportunities.customer_id');}
  if(!await exists(db,'STATISTICS','opportunities','idx_opportunity_customer')){await db.query<RowDataPacket[]>('ALTER TABLE opportunities ADD INDEX idx_opportunity_customer(customer_id)');applied.push('index idx_opportunity_customer');}
  if(!await exists(db,'REFERENTIAL_CONSTRAINTS','opportunities','fk_opportunity_customer')){await db.query<RowDataPacket[]>('ALTER TABLE opportunities ADD CONSTRAINT fk_opportunity_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE');applied.push('clé fk_opportunity_customer');}
  if(!await exists(db,'COLUMNS','activities','customer_id')){await db.query<RowDataPacket[]>('ALTER TABLE activities ADD COLUMN customer_id BIGINT UNSIGNED NULL FIRST');applied.push('colonne activities.customer_id');}
  if(!await exists(db,'STATISTICS','activities','idx_activity_customer')){await db.query<RowDataPacket[]>('ALTER TABLE activities ADD INDEX idx_activity_customer(customer_id)');applied.push('index idx_activity_customer');}
  if(!await exists(db,'REFERENTIAL_CONSTRAINTS','activities','fk_activity_customer')){await db.query<RowDataPacket[]>('ALTER TABLE activities ADD CONSTRAINT fk_activity_customer FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE');applied.push('clé fk_activity_customer');}

  const[columns]=await db.query<RowDataPacket[]>(`SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${Object.keys(CUSTOMERS_360_SCHEMA).map(()=>'?').join(',')})`,Object.keys(CUSTOMERS_360_SCHEMA));
  const available=new Set(columns.map(row=>`${row.TABLE_NAME}.${row.COLUMN_NAME}`));
  const missing=Object.entries(CUSTOMERS_360_SCHEMA).flatMap(([table,names])=>names.filter(name=>!available.has(`${table}.${name}`)).map(name=>`${table}.${name}`));
  if(missing.length)throw new Error(`Schéma Client 360 incomplet après migration : ${missing.join(', ')}`);
  return applied;
}

async function main(){try{const applied=await migrateCustomers360();console.log(applied.length?`Migration Client 360 appliquée : ${applied.join(', ')}`:'Migration Client 360 : schéma déjà à jour.');}catch(error){console.error('Échec migration Client 360 :',error);process.exitCode=1;}finally{await pool.end();}}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
