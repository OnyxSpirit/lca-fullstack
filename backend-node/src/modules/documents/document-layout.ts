import PDFDocument from 'pdfkit';

export const documentStyle={
  page:{size:'A4' as const,margin:42,contentWidth:511,footerY:746},
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
  lines.push([identity.agencyAddress||identity.concessionAddress,identity.agencyCity||identity.concessionCity].filter(Boolean).join(', '),[identity.phone,identity.email].filter(Boolean).join(' · '));
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

export function documentFooterLines(identity:any){
  const website=documentText(identity.website).replace(/^https?:\/\//i,'').replace(/\/$/,'');
  const legal=[["RCCM",identity.rccm],["NIU",identity.taxIdentifier],["RIB",identity.rib],["Site web",website]].flatMap(([label,value])=>{const clean=documentText(value);return clean?[`${label} : ${clean}`]:[]}).join(' • ');
  const address=[identity.agencyAddress||identity.concessionAddress,identity.agencyCity||identity.concessionCity].filter(Boolean).map(documentText).join(', ');
  const contact=[["Adresse",address],["Tél.",identity.phone]].flatMap(([label,value])=>{const clean=documentText(value);return clean?[`${label} : ${clean}`]:[]}).join(' • ');
  return{legal,contact};
}

function footerFontSize(doc:PDFKit.PDFDocument,value:string,width:number,maxLines:number){let size=7;while(size>5.2){doc.fontSize(size);if(doc.heightOfString(value,{width,align:'center'})<=size*1.35*maxLines)return size;size-=.2}return 5.2}

export function drawDocumentFooter(doc:PDFKit.PDFDocument,identity:any){
  const range=doc.bufferedPageRange();
  const lines=documentFooterLines(identity);
  for(let index=0;index<range.count;index++){doc.switchToPage(index);doc.moveTo(42,documentStyle.page.footerY-7).lineTo(553,documentStyle.page.footerY-7).strokeColor(documentStyle.colors.line).lineWidth(.5).stroke();doc.fillColor(documentStyle.colors.muted).font('Helvetica');if(lines.legal)doc.fontSize(footerFontSize(doc,lines.legal,511,3)).text(lines.legal,42,documentStyle.page.footerY,{width:511,height:27,align:'center'});if(lines.contact)doc.fontSize(footerFontSize(doc,lines.contact,511,2)).text(lines.contact,42,775,{width:511,height:13,align:'center'});doc.fontSize(6).text(`Page ${index+1} / ${range.count}`,42,792,{width:511,align:'center',lineBreak:false})}
}
