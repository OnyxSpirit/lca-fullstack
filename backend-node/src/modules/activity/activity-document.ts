import PDFDocument from 'pdfkit';
import {createDocument,documentStyle,drawDocumentFooter,drawDocumentHeader,drawSection,documentText} from '../documents/document-layout.js';

export type ActivityDocumentRow={createdAt:unknown;actor:{name:string};action:unknown;category:unknown;resource:unknown;module:unknown;context:{agencyName:string|null;concessionName:string|null};detailsRestricted:boolean};

const frenchCategory:Record<string,string>={CREATE:'Création',UPDATE:'Modification',STATUS:'Statut / affectation',APPROVE:'Approbation',REJECT:'Refus',CANCEL:'Annulation',PAYMENT:'Encaissement',REFUND:'Remboursement',DOCUMENT:'Document',SECURITY:'Sécurité',OTHER:'Autre'};
const showDate=(value:unknown)=>{const date=new Date(String(value));return Number.isNaN(date.getTime())?documentText(value):new Intl.DateTimeFormat('fr-CG',{dateStyle:'short',timeStyle:'medium',timeZone:'Africa/Brazzaville'}).format(date)};

export async function renderActivityReport(identity:any,rows:ActivityDocumentRow[],meta:{title:string;reference:string;period:string;filters:string}){
 return new Promise<Buffer>((resolve,reject)=>{const doc=createDocument(meta.title),chunks:Buffer[]=[];doc.on('data',(chunk:Buffer)=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
  const header=()=>drawDocumentHeader(doc,identity,meta.title,meta.reference,`Édité le ${new Intl.DateTimeFormat('fr-CG',{dateStyle:'short',timeStyle:'short',timeZone:'Africa/Brazzaville'}).format(new Date())}`);
  const columns=[{x:42,w:70,label:'DATE'},{x:112,w:92,label:'AGENT'},{x:204,w:104,label:'ACTION'},{x:308,w:125,label:'RESSOURCE'},{x:433,w:120,label:'CONTEXTE'}];
  const tableHeader=(y:number)=>{doc.rect(42,y,511,22).fill(documentStyle.colors.surface);for(const col of columns)doc.fillColor(documentStyle.colors.muted).font('Helvetica-Bold').fontSize(6.5).text(col.label,col.x+3,y+8,{width:col.w-6});return y+22};
  header();let y=drawSection(doc,'PÉRIMÈTRE DU RAPPORT',180);doc.fillColor(documentStyle.colors.text).font('Helvetica').fontSize(8).text(`Période : ${meta.period}`,48,y+9,{width:499});doc.text(`Filtres : ${meta.filters}`,48,y+24,{width:499});doc.font('Helvetica-Bold').text(`Nombre total d’activités : ${rows.length}`,48,y+39,{width:499});y=drawSection(doc,'ACTIVITÉS CHRONOLOGIQUES',y+59);y=tableHeader(y);
  for(const row of rows){const values=[showDate(row.createdAt),documentText(row.actor.name),`${frenchCategory[String(row.category)]??documentText(row.category)}\n${documentText(row.action)}`,`${documentText(row.resource)}\n${documentText(row.module)}`,documentText(row.context.agencyName??row.context.concessionName??'Contexte non renseigné')];const height=Math.max(30,...values.map((value,index)=>doc.font('Helvetica').fontSize(6.8).heightOfString(value,{width:columns[index]!.w-8})+10));if(y+height>720){doc.addPage();header();y=tableHeader(180)}doc.rect(42,y,511,height).strokeColor(documentStyle.colors.line).lineWidth(.4).stroke();values.forEach((value,index)=>doc.fillColor(documentStyle.colors.text).font('Helvetica').fontSize(6.8).text(value,columns[index]!.x+4,y+6,{width:columns[index]!.w-8,height:height-8}));y+=height}
  if(!rows.length)doc.fillColor(documentStyle.colors.muted).font('Helvetica').fontSize(9).text('Aucune activité ne correspond aux filtres appliqués.',42,y+15,{width:511,align:'center'});
  drawDocumentFooter(doc,identity);doc.end()})
}
