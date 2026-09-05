import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { HttpError } from '../../shared/http-error.js';

export type LockedPartStock = RowDataPacket & { id:string; part_id:string; agency_id:string; location_id:string|null; current_stock:string; reserved_stock:string; min_stock:string };

export async function validateStockLocation(connection:PoolConnection,agencyId:string,locationId:string|null){
  if(!locationId)return;
  const [rows]=await connection.execute<RowDataPacket[]>('SELECT id FROM locations WHERE id=? AND agency_id=? AND is_active=TRUE',[locationId,agencyId]);
  if(!rows[0])throw new HttpError(400,"L'emplacement n'appartient pas à l'agence sélectionnée");
}

export async function lockPartStock(connection:PoolConnection,partId:string,agencyId:string,locationId:string|null,create=false):Promise<LockedPartStock>{
  await validateStockLocation(connection,agencyId,locationId);
  if(locationId){
    let [rows]=await connection.execute<LockedPartStock[]>('SELECT * FROM part_stocks WHERE part_id=? AND agency_id=? AND location_id=? FOR UPDATE',[partId,agencyId,locationId]);
    if(!rows[0]&&create){await connection.execute('INSERT INTO part_stocks(part_id,agency_id,location_id) VALUES(?,?,?)',[partId,agencyId,locationId]);[rows]=await connection.execute<LockedPartStock[]>('SELECT * FROM part_stocks WHERE part_id=? AND agency_id=? AND location_id=? FOR UPDATE',[partId,agencyId,locationId]);}
    if(!rows[0])throw new HttpError(404,'Stock de la pièce introuvable dans cet emplacement');
    return rows[0];
  }
  let [rows]=await connection.execute<LockedPartStock[]>('SELECT * FROM part_stocks WHERE part_id=? AND agency_id=? ORDER BY id FOR UPDATE',[partId,agencyId]);
  if(rows.length>1)throw new HttpError(400,'Un emplacement est requis pour cette pièce');
  if(!rows[0]&&create){await connection.execute('INSERT INTO part_stocks(part_id,agency_id,location_id) VALUES(?,?,NULL)',[partId,agencyId]);[rows]=await connection.execute<LockedPartStock[]>('SELECT * FROM part_stocks WHERE part_id=? AND agency_id=? AND location_id IS NULL FOR UPDATE',[partId,agencyId]);}
  if(!rows[0])throw new HttpError(404,"Aucun stock n'est affecté à cette agence");
  return rows[0];
}

export async function lockPartStockById(connection:PoolConnection,stockId:string,partId:string,agencyId:string):Promise<LockedPartStock>{
  const [rows]=await connection.execute<LockedPartStock[]>('SELECT * FROM part_stocks WHERE id=? AND part_id=? AND agency_id=? FOR UPDATE',[stockId,partId,agencyId]);
  if(!rows[0])throw new HttpError(404,"Stock de la pièce introuvable dans cette agence");
  return rows[0];
}
