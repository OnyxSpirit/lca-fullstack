import type{RowDataPacket}from'mysql2/promise';
import{query}from'../../config/database.js';

export type WarrantyContractDecision='UNDETERMINED'|'APPLICABLE'|'NOT_APPLICABLE';
export type WarrantyContractStatus='PENDING_DECISION'|'NOT_APPLICABLE'|'PENDING_ACTIVATION'|'ACTIVE';
export type WarrantyEligibility='UNDETERMINED'|'NOT_APPLICABLE'|'PLANNED'|'ACTIVE'|'EXPIRED_BY_DATE'|'MILEAGE_REQUIRED'|'EXPIRED_BY_MILEAGE';
export type WarrantyDocumentContext={
 vehicleId:string|null;saleId:string|null;contractId:string|null;
 contractDecision:WarrantyContractDecision|null;contractStatus:WarrantyContractStatus|null;eligibility:WarrantyEligibility|null;
 providerCode:string|null;providerName:string|null;durationMonths:number|null;mileageLimit:number|null;
 decisionAt:unknown;startDate:unknown;expiryDate:unknown;initialMileage:number|null;currentMileage:number|null;
 claim:null|{decisionStatus:'PENDING'|'APPROVED'|'REJECTED';coverageMode:'FULL'|'PARTIAL'|null;providerName:string|null;authorizationReference:string|null;allocationStatus:string;amountsKnown:boolean;realTotal:number|null;manufacturerShare:number|null;customerShare:number|null;claimNumber:string|null;claimStatus:string|null;claimTotal:number|null;amountReceived:number|null;balanceDue:number|null};
};
export type WarrantyDocumentLookup={vehicleId?:string|null;saleId?:string|null;quotationId?:string|null;invoiceId?:string|null;repairOrderId?:string|null;currentMileage?:number|null;asOf?:Date};
const id=(value:unknown)=>value==null?null:String(value),num=(value:unknown)=>value==null?null:Number(value),money=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
export function deriveWarrantyEligibility(contract:{decision:WarrantyContractDecision;status:WarrantyContractStatus;expiryDate?:unknown;mileageLimit?:number|null},currentMileage:number|null,now=new Date()):WarrantyEligibility{if(contract.decision==='UNDETERMINED')return'UNDETERMINED';if(contract.decision==='NOT_APPLICABLE')return'NOT_APPLICABLE';if(contract.status!=='ACTIVE')return'PLANNED';if(contract.expiryDate&&new Date(String(contract.expiryDate)).getTime()<now.getTime())return'EXPIRED_BY_DATE';if(contract.mileageLimit!=null&&currentMileage==null)return'MILEAGE_REQUIRED';if(contract.mileageLimit!=null&&currentMileage!==null&&currentMileage>contract.mileageLimit)return'EXPIRED_BY_MILEAGE';return'ACTIVE'}

async function resolveLinks(input:WarrantyDocumentLookup){
 let vehicleId=id(input.vehicleId),saleId=id(input.saleId),repairOrderId=id(input.repairOrderId),invoiceType:string|null=null;
 if(input.invoiceId){const[row]=await query<RowDataPacket[]>('SELECT sale_id,repair_order_id,invoice_type FROM invoices WHERE id=?',[input.invoiceId]);if(row){saleId=id(row.sale_id);repairOrderId=id(row.repair_order_id);invoiceType=String(row.invoice_type)}}
 if(repairOrderId&&!vehicleId){const[row]=await query<RowDataPacket[]>('SELECT vehicle_id FROM repair_orders WHERE id=?',[repairOrderId]);vehicleId=id(row?.vehicle_id)}
 if(input.quotationId&&!vehicleId){const[row]=await query<RowDataPacket[]>('SELECT qi.vehicle_id,(SELECT s.id FROM sales s WHERE s.quotation_id=q.id ORDER BY s.id DESC LIMIT 1) sale_id FROM quotations q LEFT JOIN quotation_items qi ON qi.quotation_id=q.id AND qi.vehicle_id IS NOT NULL WHERE q.id=? ORDER BY qi.id LIMIT 1',[input.quotationId]);vehicleId=id(row?.vehicle_id);saleId=id(row?.sale_id)}
 if(saleId&&!vehicleId){const[row]=await query<RowDataPacket[]>('SELECT vehicle_id FROM sale_items WHERE sale_id=? AND vehicle_id IS NOT NULL ORDER BY id LIMIT 1',[saleId]);vehicleId=id(row?.vehicle_id)}
 return{vehicleId,saleId,repairOrderId,invoiceType};
}

export async function loadWarrantyDocumentContext(input:WarrantyDocumentLookup):Promise<WarrantyDocumentContext|null>{
 const links=await resolveLinks(input);if(!links.vehicleId||input.quotationId&&!links.saleId)return null;
 const contracts=links.saleId?await query<RowDataPacket[]>('SELECT * FROM vehicle_warranty_contracts WHERE sale_id=? AND vehicle_id=? ORDER BY id DESC LIMIT 1',[links.saleId,links.vehicleId]):await query<RowDataPacket[]>('SELECT * FROM vehicle_warranty_contracts WHERE vehicle_id=? ORDER BY created_at DESC,id DESC LIMIT 1',[links.vehicleId]);
 const contract=contracts[0];if(!contract)return null;
 const now=input.asOf??new Date(),activatedAfterMoment=Boolean(input.asOf&&contract.activated_at&&new Date(contract.activated_at).getTime()>input.asOf.getTime()),effectiveStatus=(activatedAfterMoment?'PENDING_ACTIVATION':contract.status)as WarrantyContractStatus,currentMileage=input.currentMileage==null?null:Number(input.currentMileage),eligibility=deriveWarrantyEligibility({decision:contract.decision,status:effectiveStatus,expiryDate:activatedAfterMoment?null:contract.expiry_date,mileageLimit:num(contract.mileage_limit)},currentMileage,now);
 let claim:WarrantyDocumentContext['claim']=null;
 if(links.repairOrderId){const[rows,allocations,claims]=await Promise.all([
  query<RowDataPacket[]>(`SELECT w.*,p.name provider_name FROM repair_order_warranties w LEFT JOIN warranty_providers p ON p.id=w.provider_id WHERE w.repair_order_id=?`,[links.repairOrderId]),
  query<RowDataPacket[]>(`SELECT a.manufacturer_share_ht,i.line_total,i.tax_rate,i.status FROM repair_order_warranty_allocations a JOIN repair_order_warranties w ON w.id=a.warranty_id JOIN repair_order_items i ON i.id=a.repair_order_item_id WHERE w.repair_order_id=?`,[links.repairOrderId]),
  query<RowDataPacket[]>(`SELECT c.* FROM warranty_claims c JOIN repair_order_warranties w ON w.id=c.warranty_id WHERE w.repair_order_id=?`,[links.repairOrderId]),
  ]),w=rows[0];if(w){const active=allocations.filter(x=>x.status==='active'),amountsKnown=w.allocation_status==='CONFIRMED',real=active.reduce((sum,x)=>sum+Number(x.line_total)*(1+Number(x.tax_rate)/100),0),manufacturer=active.reduce((sum,x)=>sum+Number(x.manufacturer_share_ht)*(1+Number(x.tax_rate)/100),0),c=claims[0];claim={decisionStatus:w.decision_status,coverageMode:w.coverage_mode,providerName:contract.provider_name_snapshot??w.provider_name??null,authorizationReference:w.authorization_reference??null,allocationStatus:w.allocation_status,amountsKnown,realTotal:amountsKnown?money(real):null,manufacturerShare:amountsKnown?money(manufacturer):null,customerShare:amountsKnown?money(real-manufacturer):null,claimNumber:c?.claim_number??null,claimStatus:c?.status??null,claimTotal:num(c?.total),amountReceived:num(c?.amount_received),balanceDue:num(c?.balance_due)}}
 }
 return{vehicleId:links.vehicleId,saleId:links.saleId,contractId:String(contract.id),contractDecision:contract.decision,contractStatus:effectiveStatus,eligibility,providerCode:contract.provider_code_snapshot??null,providerName:contract.provider_name_snapshot??null,durationMonths:num(contract.duration_months),mileageLimit:num(contract.mileage_limit),decisionAt:contract.decision_at??null,startDate:activatedAfterMoment?null:contract.start_date??null,expiryDate:activatedAfterMoment?null:contract.expiry_date??null,initialMileage:activatedAfterMoment?null:num(contract.initial_mileage),currentMileage,claim};
}

export function warrantyContextForDocument(context:WarrantyDocumentContext|null,document:'quotation'|'sale'|'vehicle_invoice'|'workshop_invoice'|'delivery'|'vehicle'|'repair_order'){
 if(!context)return null;
 if(['quotation','sale','vehicle_invoice','delivery'].includes(document))return context.contractDecision==='APPLICABLE'?context:null;
 if(document==='workshop_invoice')return context.claim?.decisionStatus==='APPROVED'&&context.claim.amountsKnown?context:null;
 if(document==='repair_order')return context.contractDecision==='APPLICABLE'||Boolean(context.claim)?context:null;
 return context.contractDecision==='APPLICABLE'?context:null;
}
