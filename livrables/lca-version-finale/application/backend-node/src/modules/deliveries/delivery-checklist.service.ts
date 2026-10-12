import type{PoolConnection,ResultSetHeader,RowDataPacket}from'mysql2/promise';
import{query}from'../../config/database.js';
import{HttpError}from'../../shared/http-error.js';

export async function createDeliveryChecklistSnapshot(connection:PoolConnection,deliveryId:string,userId:string,selectedCategoryIds?:string[]){
  const[existing]=await connection.execute<RowDataPacket[]>('SELECT id FROM delivery_checklist_category_instances WHERE delivery_id=? LIMIT 1 FOR UPDATE',[deliveryId]);
  if(existing[0])return false;
  const[deliveries]=await connection.execute<RowDataPacket[]>('SELECT a.concession_id FROM deliveries d JOIN agencies a ON a.id=d.agency_id WHERE d.id=?',[deliveryId]),delivery=deliveries[0];
  if(!delivery)throw new HttpError(404,'Livraison introuvable');
  const ids=selectedCategoryIds?.map(String)??[];
  if(ids.some(id=>!/^[1-9]\d*$/.test(id))||new Set(ids).size!==ids.length)throw new HttpError(400,'Sélection de catégories invalide');
  const params:any[]=[delivery.concession_id];
  let filter='';
  if(ids.length){filter=` AND c.id IN (${ids.map(()=>'?').join(',')})`;params.push(...ids)}
  const[categories]=await connection.execute<RowDataPacket[]>(`SELECT c.id,c.code,c.name,c.description,c.sort_order FROM delivery_checklist_categories c WHERE c.concession_id=? AND c.is_active=TRUE${filter} ORDER BY c.sort_order,c.id FOR SHARE`,params);
  if(ids.length&&categories.length!==ids.length)throw new HttpError(400,'Une catégorie sélectionnée est inactive ou hors concession');
  if(!categories.length)throw new HttpError(409,'Aucune catégorie active ne permet de démarrer la préparation');
  for(const category of categories){
    const[items]=await connection.execute<RowDataPacket[]>('SELECT id,code,name,description,is_mandatory,sort_order FROM delivery_checklist_items WHERE category_id=? AND is_active=TRUE ORDER BY sort_order,id FOR SHARE',[category.id]);
    const[result]=await connection.execute<ResultSetHeader>('INSERT INTO delivery_checklist_category_instances(delivery_id,source_category_id,code_snapshot,name_snapshot,description_snapshot,sort_order_snapshot,created_by) VALUES(?,?,?,?,?,?,?)',[deliveryId,category.id,category.code,category.name,category.description,category.sort_order,userId]);
    for(const item of items)await connection.execute('INSERT INTO delivery_checklist_item_instances(category_instance_id,source_item_id,code_snapshot,name_snapshot,description_snapshot,is_mandatory_snapshot,sort_order_snapshot) VALUES(?,?,?,?,?,?,?)',[result.insertId,item.id,item.code,item.name,item.description,item.is_mandatory,item.sort_order]);
  }
  return true;
}

export async function checklistSnapshot(connection:PoolConnection|{execute:PoolConnection['execute']},deliveryId:string){
  const[categories]=await connection.execute<RowDataPacket[]>(`SELECT ci.id,ci.code_snapshot,ci.name_snapshot,ci.description_snapshot,ci.sort_order_snapshot,ci.created_at,
    COUNT(ii.id) total_items,SUM(ii.is_completed=TRUE) completed_items,SUM(ii.is_mandatory_snapshot=TRUE) mandatory_total,SUM(ii.is_mandatory_snapshot=TRUE AND ii.is_completed=TRUE) mandatory_completed
    FROM delivery_checklist_category_instances ci LEFT JOIN delivery_checklist_item_instances ii ON ii.category_instance_id=ci.id
    WHERE ci.delivery_id=? GROUP BY ci.id ORDER BY ci.sort_order_snapshot,ci.id`,[deliveryId]);
  const[items]=await connection.execute<RowDataPacket[]>(`SELECT ii.*,CONCAT_WS(' ',u.first_name,u.last_name) completed_by_name FROM delivery_checklist_item_instances ii
    JOIN delivery_checklist_category_instances ci ON ci.id=ii.category_instance_id LEFT JOIN users u ON u.id=ii.completed_by
    WHERE ci.delivery_id=? ORDER BY ci.sort_order_snapshot,ci.id,ii.sort_order_snapshot,ii.id`,[deliveryId]);
  return categories.map(category=>{
    const categoryItems=items.filter(item=>String(item.category_instance_id)===String(category.id));
    const mandatoryTotal=Number(category.mandatory_total??0),mandatoryCompleted=Number(category.mandatory_completed??0),completed=Number(category.completed_items??0),total=Number(category.total_items??0);
    return{...category,total_items:total,completed_items:completed,mandatory_total:mandatoryTotal,mandatory_completed:mandatoryCompleted,status:completed===0?'NOT_STARTED':completed===total?'COMPLETED':'IN_PROGRESS',items:categoryItems};
  });
}

export async function readDeliveryChecklist(deliveryId:string){
  const executor={execute:async(sql:string,params?:unknown[])=>[await query<RowDataPacket[]>(sql,params)] as any};
  return checklistSnapshot(executor as any,deliveryId);
}

export async function lockAndAssertDeliveryChecklistComplete(connection:PoolConnection,deliveryId:string){
  const[categories]=await connection.execute<RowDataPacket[]>('SELECT id FROM delivery_checklist_category_instances WHERE delivery_id=? ORDER BY id FOR UPDATE',[deliveryId]);
  if(!categories.length)throw new HttpError(409,'La checklist de préparation doit être démarrée avant la remise du véhicule.');
  const[items]=await connection.execute<RowDataPacket[]>(`SELECT ii.id,ii.is_mandatory_snapshot,ii.is_completed FROM delivery_checklist_item_instances ii JOIN delivery_checklist_category_instances ci ON ci.id=ii.category_instance_id WHERE ci.delivery_id=? ORDER BY ii.id FOR UPDATE`,[deliveryId]);
  if(items.some(item=>Boolean(item.is_mandatory_snapshot)&&!Boolean(item.is_completed)))throw new HttpError(409,'Les éléments obligatoires de la checklist doivent être terminés avant la remise du véhicule.');
}
