import{createDocument,drawDocumentFooter,drawDocumentHeader,drawSection,documentText}from'./document-layout.js';

export type OfficialField={label:string;value:unknown};
export type OfficialColumn={label:string;key:string;width:number;align?:'left'|'right'};
export type OfficialRecordInput={identity:any;title:string;reference:string;dateLabel?:string;fields?:OfficialField[];sections?:Array<{title:string;fields:OfficialField[]}>;columns?:OfficialColumn[];rows?:Array<Record<string,unknown>>;signatureLabels?:string[];notice?:string};
const value=(raw:unknown)=>documentText(raw)||'—';

export async function renderOfficialRecord(input:OfficialRecordInput){
 return new Promise<Buffer>((resolve,reject)=>{const doc=createDocument(input.title),chunks:Buffer[]=[];doc.on('data',(chunk:Buffer)=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
  const header=()=>{drawDocumentHeader(doc,input.identity,input.title,input.reference,input.dateLabel??`Édité le ${new Intl.DateTimeFormat('fr-CG',{dateStyle:'short',timeStyle:'short',timeZone:input.identity.timezone??'Africa/Brazzaville'}).format(new Date())}`);return 180};
  const newPage=()=>{doc.addPage();return header()};let y=header();
  const ensure=(height:number)=>{if(y+height>725)y=newPage()};
  const fields=(title:string,items:OfficialField[])=>{if(!items.length)return;ensure(38);y=drawSection(doc,title,y);for(const item of items){ensure(28);doc.rect(42,y,511,27).strokeColor('#e2e8f0').lineWidth(.4).stroke();doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(6.8).text(item.label.toUpperCase(),50,y+7,{width:135,height:15,ellipsis:true});doc.fillColor('#111827').font('Helvetica').fontSize(8).text(value(item.value),190,y+7,{width:353,height:15,ellipsis:true});y+=27}y+=10};
  fields('INFORMATIONS',input.fields??[]);for(const section of input.sections??[])fields(section.title,section.fields);
  if(input.columns?.length){ensure(50);y=drawSection(doc,'DÉTAIL',y);const tableHeader=()=>{doc.rect(42,y,511,24).fill('#f1f5f9');let x=42;for(const column of input.columns!){doc.fillColor('#334155').font('Helvetica-Bold').fontSize(6.2).text(column.label,x+3,y+8,{width:column.width-6,align:column.align??'left',lineBreak:false});x+=column.width}y+=24};tableHeader();for(const row of input.rows??[]){if(y+23>725){y=newPage();y=drawSection(doc,'DÉTAIL — SUITE',y);tableHeader()}let x=42;for(const column of input.columns){doc.fillColor('#111827').font('Helvetica').fontSize(6.3).text(value(row[column.key]),x+3,y+6,{width:column.width-6,height:13,align:column.align??'left',ellipsis:true});x+=column.width}doc.moveTo(42,y+21).lineTo(553,y+21).strokeColor('#e2e8f0').lineWidth(.35).stroke();y+=22}y+=10}
  if(input.notice){ensure(42);doc.roundedRect(42,y,511,34,3).fill('#f8fafc');doc.fillColor('#475569').font('Helvetica').fontSize(7).text(value(input.notice),51,y+9,{width:493,height:18});y+=44}
  if(input.signatureLabels?.length){ensure(105);y=drawSection(doc,'VALIDATIONS',y);const width=511/input.signatureLabels.length;input.signatureLabels.forEach((label,index)=>{const x=42+index*width;doc.rect(x,y,width,78).strokeColor('#cbd5e1').stroke();doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(7).text(label,x+5,y+9,{width:width-10,align:'center'});doc.font('Helvetica').fontSize(6.5).text('Nom, date et signature',x+5,y+59,{width:width-10,align:'center'})});y+=88}
  drawDocumentFooter(doc,input.identity);doc.end()})
}
