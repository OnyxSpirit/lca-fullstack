import PDFDocument from 'pdfkit';

export const documentStyle={
  page:{size:'A4' as const,margin:42,contentWidth:511,footerY:780},
  colors:{primary:'#8f1722',text:'#111827',muted:'#64748b',border:'#cbd5e1',line:'#e2e8f0',surface:'#f8fafc',white:'#ffffff'},
  logo:{x:42,y:38,width:95,height:55},
  title:{ruleY:110,y:126,referenceY:153,contentY:180},
  font:{body:8.5,label:7,section:8,title:18,reference:11},
} as const;

export const documentText=(value:unknown)=>String(value??'').replace(/[\u0000-\u001f]/g,' ').trim();

export function createDocument(title:string){
  return new PDFDocument({size:documentStyle.page.size,margin:documentStyle.page.margin,bufferPages:true,info:{Title:title}});
}

export function documentBuffer(render:(doc:PDFKit.PDFDocument)=>void){
  return new Promise<Buffer>((resolve,reject)=>{const doc=createDocument('Document ERP'),chunks:Buffer[]=[];doc.on('data',(chunk:Buffer)=>chunks.push(chunk));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));render(doc);doc.end()});
}

export function drawCompanyIdentity(doc:PDFKit.PDFDocument,identity:any){
  let logoDrawn=false;
  for(const logo of identity.logoCandidates??[identity.logoBase64]){try{doc.image(Buffer.from(String(logo),'base64'),documentStyle.logo.x,documentStyle.logo.y,{fit:[documentStyle.logo.width,documentStyle.logo.height],valign:'center'});logoDrawn=true;break}catch{continue}}
  const x=logoDrawn?155:42,width=logoDrawn?398:511,align=logoDrawn?'right':'left';
  const name=documentText(identity.legalName||identity.tradeName),names=new Set([name.toLocaleLowerCase()]);
  if(!logoDrawn&&name)doc.fillColor(documentStyle.colors.text).font('Helvetica-Bold').fontSize(13).text(name,x,40,{width,align});
  const lines:unknown[]=[];
  if(!logoDrawn){const trade=documentText(identity.tradeName);if(trade&&!names.has(trade.toLocaleLowerCase())){lines.push(trade);names.add(trade.toLocaleLowerCase())}}
  const agency=documentText(identity.agencyName);if(agency&&!names.has(agency.toLocaleLowerCase()))lines.push(agency);
  lines.push([identity.agencyAddress,identity.agencyCity].filter(Boolean).join(', '),[identity.phone,identity.email].filter(Boolean).join(' · '),identity.taxIdentifier?`Identifiant fiscal : ${identity.taxIdentifier}`:'');
  doc.fillColor(documentStyle.colors.text).font('Helvetica').fontSize(8).text(lines.filter(Boolean).map(documentText).join('\n'),x,58,{width,align});
}

export function drawDocumentHeader(doc:PDFKit.PDFDocument,identity:any,title:string,reference:string,dateLabel:string){
  drawCompanyIdentity(doc,identity);
  doc.moveTo(42,documentStyle.title.ruleY).lineTo(553,documentStyle.title.ruleY).strokeColor(documentStyle.colors.primary).lineWidth(1.2).stroke();
  doc.fillColor(documentStyle.colors.primary).font('Helvetica-Bold').fontSize(title.length>24?15:documentStyle.font.title).text(title,42,documentStyle.title.y,{width:350});
  doc.fillColor(documentStyle.colors.text).fontSize(documentStyle.font.reference).text(documentText(reference),42,documentStyle.title.referenceY,{width:300});
  doc.font('Helvetica').fontSize(8).text(documentText(dateLabel),400,137,{width:153,align:'right'});
}

export function drawSection(doc:PDFKit.PDFDocument,title:string,y:number){
  doc.rect(42,y,documentStyle.page.contentWidth,23).fill(documentStyle.colors.primary);
  doc.fillColor(documentStyle.colors.white).font('Helvetica-Bold').fontSize(documentStyle.font.section).text(title,52,y+8,{width:490});
  return y+23;
}

export function drawDocumentFooter(doc:PDFKit.PDFDocument,identity:any){
  const range=doc.bufferedPageRange();
  for(let index=0;index<range.count;index++){doc.switchToPage(index);doc.fillColor(documentStyle.colors.muted).font('Helvetica').fontSize(7).text([identity.legalName||identity.tradeName,identity.taxIdentifier,identity.phone,identity.email].filter(Boolean).map(documentText).join(' • '),42,documentStyle.page.footerY,{width:430,lineBreak:false}).text(`Page ${index+1} / ${range.count}`,480,documentStyle.page.footerY,{width:73,align:'right',lineBreak:false})}
}
