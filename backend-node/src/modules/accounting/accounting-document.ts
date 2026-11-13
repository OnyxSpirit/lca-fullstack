import{createDocument,drawDocumentFooter,drawDocumentHeader,drawSection,documentText}from'../documents/document-layout.js';
type Cell=string|number|null|undefined;
type Column={label:string;width:number;align?:'left'|'right'};
const money=(value:Cell)=>Number(value??0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=(value:unknown)=>String(value??'').slice(0,10).split('-').reverse().join('/');
export async function renderAccountingTable(input:{identity:any;title:string;reference:string;period:{from:string;to:string};columns:Column[];rows:Cell[][];totals?:Cell[]}){
 return new Promise<Buffer>((resolve,reject)=>{const doc=createDocument(input.title),chunks:Buffer[]=[];doc.on('data',(chunk:Buffer)=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
  const header=()=>{drawDocumentHeader(doc,input.identity,input.title,input.reference,`Période du ${dateLabel(input.period.from)} au ${dateLabel(input.period.to)}`);let y=drawSection(doc,'DONNÉES COMPTABLES',180);doc.fillColor('#f1f5f9').rect(42,y,511,24).fill();let x=42;for(const column of input.columns){doc.fillColor('#334155').font('Helvetica-Bold').fontSize(6.5).text(column.label,x+3,y+8,{width:column.width-6,align:column.align??'left',lineBreak:false});x+=column.width}return y+24};
  let y=header();const draw=(row:Cell[],bold=false)=>{if(y+24>730){doc.addPage();y=header()}let x=42;doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(6.4);row.forEach((raw,index)=>{const column=input.columns[index]!,value=column.align==='right'?money(raw):documentText(raw)||'—';doc.fillColor('#111827').text(value,x+3,y+6,{width:column.width-6,height:13,align:column.align??'left',ellipsis:true});x+=column.width});doc.moveTo(42,y+22).lineTo(553,y+22).strokeColor('#e2e8f0').lineWidth(.35).stroke();y+=22};
  input.rows.forEach(row=>draw(row));if(input.totals){y+=3;draw(input.totals,true)}drawDocumentFooter(doc,input.identity);doc.end()})
}
export const ledgerColumns:Column[]=[{label:'Date',width:48},{label:'Pièce',width:68},{label:'Journal',width:42},{label:'Compte',width:72},{label:'Libellé',width:131},{label:'Débit',width:50,align:'right'},{label:'Crédit',width:50,align:'right'},{label:'Solde',width:50,align:'right'}];
export const balanceColumns:Column[]=[{label:'Compte',width:72},{label:'Intitulé',width:169},{label:'Ouverture',width:68,align:'right'},{label:'Débit période',width:68,align:'right'},{label:'Crédit période',width:68,align:'right'},{label:'Solde',width:66,align:'right'}];
