import type{WarrantyDocumentContext}from'./warranty-document-context.js';
import{documentStyle,documentText,drawSection}from'./document-layout.js';
import{formatDocumentAmount}from'./document-money.js';

export type WarrantyRenderPolicy='CONTRACT_COMPACT'|'CONTRACT_ACTIVE'|'VEHICLE_CURRENT'|'REPAIR_ORDER'|'WORKSHOP_INVOICE';
const date=(value:unknown)=>{if(!value)return'—';const raw=value instanceof Date?value.toISOString():String(value),match=/^(\d{4})-(\d{2})-(\d{2})/.exec(raw);return match?`${match[3]}/${match[2]}/${match[1]}`:documentText(value)};
const amount=(value:number|null)=>value==null?'À déterminer':formatDocumentAmount(value,'XAF');
const limit=(value:number|null)=>value==null?'Sans plafond kilométrique contractuel':`${value.toLocaleString('fr-FR')} km`;
const contractStatus=(context:WarrantyDocumentContext,policy:WarrantyRenderPolicy)=>{if(policy==='CONTRACT_COMPACT')return context.contractStatus==='ACTIVE'?'Garantie active':'Garantie prévue — activation à la livraison';if(policy==='CONTRACT_ACTIVE')return context.contractStatus==='ACTIVE'?'Garantie activée':'Garantie prévue — activation à la livraison';if(context.eligibility==='EXPIRED_BY_DATE')return'Expirée — échéance atteinte';if(context.eligibility==='EXPIRED_BY_MILEAGE')return'Expirée — limite kilométrique dépassée';if(context.eligibility==='MILEAGE_REQUIRED')return'Active — kilométrage à vérifier';if(context.contractStatus==='ACTIVE')return'Garantie activée';return'Garantie prévue — activation à la livraison'};
const claimDecision=(value:string)=>value==='APPROVED'?'Prise en charge approuvée':value==='REJECTED'?'Prise en charge refusée':'En attente d’étude';
const claimMode=(value:string|null)=>value==='FULL'?'Prise en charge totale':value==='PARTIAL'?'Prise en charge partielle':'À déterminer';

function block(doc:PDFKit.PDFDocument,title:string,rows:Array<[string,string]>,y:number){
 y=drawSection(doc,title,y);const height=Math.max(38,rows.length*20+12);doc.rect(42,y,511,height).fillAndStroke(documentStyle.colors.surface,documentStyle.colors.border);rows.forEach(([label,value],index)=>{const rowY=y+8+index*20;doc.fillColor(documentStyle.colors.muted).font('Helvetica-Bold').fontSize(7).text(label.toUpperCase(),52,rowY,{width:160});doc.fillColor(documentStyle.colors.text).font('Helvetica').fontSize(8.5).text(value,215,rowY,{width:326})});return y+height+12;
}

export function warrantySectionHeight(context:WarrantyDocumentContext,policy:WarrantyRenderPolicy){const contract=policy==='WORKSHOP_INVOICE'?0:policy==='REPAIR_ORDER'?150:policy==='VEHICLE_CURRENT'||policy==='CONTRACT_ACTIVE'?174:114;const claim=policy==='REPAIR_ORDER'&&context.claim?context.claim.amountsKnown?174:114:policy==='WORKSHOP_INVOICE'?174:0;return contract+claim}

export function renderWarrantyDocumentSections(doc:PDFKit.PDFDocument,context:WarrantyDocumentContext,policy:WarrantyRenderPolicy,y:number,ensure:(currentY:number,needed:number)=>number){
 if(policy!=='WORKSHOP_INVOICE'&&context.contractDecision==='APPLICABLE'){
  const rows:Array<[string,string]>=[['Statut',contractStatus(context,policy)],['Constructeur',context.providerName??'—']];
  if(policy==='CONTRACT_COMPACT'){rows.push(['Durée',`${context.durationMonths??'—'} mois`],['Plafond kilométrique',limit(context.mileageLimit)])}
  else{if(context.startDate)rows.push(['Début',date(context.startDate)]);if(context.expiryDate)rows.push(['Échéance',date(context.expiryDate)]);if(context.initialMileage!=null)rows.push(['Kilométrage initial',`${context.initialMileage.toLocaleString('fr-FR')} km`]);rows.push(['Plafond kilométrique',limit(context.mileageLimit)])}
  y=ensure(y,25+Math.max(38,rows.length*20+12)+12);y=block(doc,policy==='REPAIR_ORDER'?'GARANTIE DU VÉHICULE':'GARANTIE CONSTRUCTEUR',rows,y);
 }
 const claim=context.claim;if((policy==='REPAIR_ORDER'||policy==='WORKSHOP_INVOICE')&&claim){
  const rows:Array<[string,string]>=[['Décision',claimDecision(claim.decisionStatus)]];
  if(claim.providerName)rows.push(['Constructeur',claim.providerName]);if(claim.authorizationReference)rows.push(['Autorisation',claim.authorizationReference]);
  if(claim.decisionStatus==='APPROVED')rows.push(['Type',claimMode(claim.coverageMode)]);
  if(claim.decisionStatus==='APPROVED'){rows.push(['Montant des travaux',amount(claim.realTotal)],['Part constructeur',amount(claim.manufacturerShare)],['Reste client',amount(claim.customerShare)])}
  y=ensure(y,25+Math.max(38,rows.length*20+12)+12);y=block(doc,policy==='WORKSHOP_INVOICE'?'PRISE EN CHARGE CONSTRUCTEUR':'PRISE EN CHARGE DE CET OR',rows,y);
 }
 return y;
}
