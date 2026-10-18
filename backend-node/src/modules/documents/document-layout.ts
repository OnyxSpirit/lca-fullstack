import PDFDocument from 'pdfkit';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {PNG}=require('pngjs') as {PNG:{sync:{read:(buffer:Buffer)=>{width:number;height:number;data:Buffer}}}};

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
  for(let index=0;index<range.count;index++){doc.switchToPage(index);doc.moveTo(42,documentStyle.page.footerY-7).lineTo(553,documentStyle.page.footerY-7).strokeColor(documentStyle.colors.line).lineWidth(.5).stroke();doc.fillColor(documentStyle.colors.muted).font('Helvetica');if(lines.legal)doc.fontSize(footerFontSize(doc,lines.legal,511,2)).text(lines.legal,42,documentStyle.page.footerY,{width:511,height:18,align:'center'});if(lines.contact)doc.fontSize(footerFontSize(doc,lines.contact,511,1)).text(lines.contact,42,766,{width:511,height:9,align:'center',lineBreak:false});doc.fontSize(6).text(`Page ${index+1} / ${range.count}`,42,779,{width:511,height:8,align:'center',lineBreak:false})}
}

export type OfficialMarks={signatureBuffer?:Buffer|null;stampBuffer?:Buffer|null;signatureIdentity?:string|null;signatureFunction?:string|null;stampIdentity?:string|null};
export type OfficialMarkZone={x:number;y:number;width:number;height:number};
export type VisibleImageBounds={imageWidth:number;imageHeight:number;left:number;top:number;width:number;height:number};
export type OfficialMarkPlacement={drawX:number;drawY:number;drawWidth:number;drawHeight:number;visibleX:number;visibleY:number;visibleWidth:number;visibleHeight:number};

export const cmToPdfPoints=(centimeters:number)=>centimeters*72/2.54;
export const officialMarkDimensions={
  signatureWidth:cmToPdfPoints(4),
  signatureMaxWidth:cmToPdfPoints(4.5),
  stampZone:cmToPdfPoints(4),
  stampVisibleMax:cmToPdfPoints(3.8),
  overlap:cmToPdfPoints(.7),
  identityHeight:24,
}as const;

function jpegDimensions(buffer:Buffer){
  if(buffer.length<4||buffer[0]!==0xff||buffer[1]!==0xd8)return null;
  let offset=2;
  while(offset+9<buffer.length){if(buffer[offset]!==0xff){offset+=1;continue}const marker=buffer[offset+1]!,length=buffer.readUInt16BE(offset+2);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return{width:buffer.readUInt16BE(offset+7),height:buffer.readUInt16BE(offset+5)};if(length<2)return null;offset+=2+length}
  return null;
}

/** Mesure uniquement les marges périphériques, sans altérer les pixels internes. */
export function visibleImageBounds(buffer:Buffer):VisibleImageBounds|null{
  try{
    if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
      const image=PNG.sync.read(buffer),{width,height,data}=image;
      let transparent=false;for(let index=3;index<data.length;index+=4)if(data[index]!<250){transparent=true;break}
      let left=width,top=height,right=-1,bottom=-1;
      for(let y=0;y<height;y+=1)for(let x=0;x<width;x+=1){const index=(y*width+x)*4,alpha=data[index+3]!;const visible=transparent?alpha>12:alpha>12&&(data[index]!<248||data[index+1]!<248||data[index+2]!<248);if(!visible)continue;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
      if(right>=left&&bottom>=top)return{imageWidth:width,imageHeight:height,left,top,width:right-left+1,height:bottom-top+1};
      return{imageWidth:width,imageHeight:height,left:0,top:0,width,height};
    }
    const jpeg=jpegDimensions(buffer);if(jpeg)return{imageWidth:jpeg.width,imageHeight:jpeg.height,left:0,top:0,width:jpeg.width,height:jpeg.height};
  }catch{}
  return null;
}

function placement(bounds:VisibleImageBounds,visibleX:number,visibleY:number,visibleWidth:number,visibleHeight:number):OfficialMarkPlacement{
  const scale=visibleWidth/bounds.width;
  return{drawX:visibleX-bounds.left*scale,drawY:visibleY-bounds.top*scale,drawWidth:bounds.imageWidth*scale,drawHeight:bounds.imageHeight*scale,visibleX,visibleY,visibleWidth,visibleHeight};
}

export function calculateOfficialMarkPlacements(marks:OfficialMarks,zone:OfficialMarkZone){
  const markHeight=Math.min(officialMarkDimensions.stampZone,Math.max(0,zone.height-officialMarkDimensions.identityHeight));
  const signatureBounds=marks.signatureBuffer?visibleImageBounds(marks.signatureBuffer):null,stampBounds=marks.stampBuffer?visibleImageBounds(marks.stampBuffer):null;
  let signatureSize=signatureBounds?{width:officialMarkDimensions.signatureWidth,height:officialMarkDimensions.signatureWidth*signatureBounds.height/signatureBounds.width}:null;
  if(signatureSize&&signatureSize.height>markHeight){const ratio=markHeight/signatureSize.height;signatureSize={width:signatureSize.width*ratio,height:markHeight}}
  if(signatureSize)signatureSize.width=Math.min(signatureSize.width,officialMarkDimensions.signatureMaxWidth);
  const stampScale=stampBounds?Math.min(officialMarkDimensions.stampVisibleMax/stampBounds.width,officialMarkDimensions.stampVisibleMax/stampBounds.height):0;
  const stampSize=stampBounds?{width:stampBounds.width*stampScale,height:stampBounds.height*stampScale}:null;
  const overlap=signatureSize&&stampSize?Math.min(officialMarkDimensions.overlap,signatureSize.width*.3,stampSize.width*.3):0;
  const groupWidth=(signatureSize?.width??0)+(stampSize?.width??0)-overlap;
  const startX=zone.x+Math.max(0,(zone.width-groupWidth)/2);
  const signature=signatureBounds&&signatureSize?placement(signatureBounds,startX,zone.y+(markHeight-signatureSize.height)/2,signatureSize.width,signatureSize.height):null;
  const stampX=startX+(signatureSize?signatureSize.width-overlap:0);
  const stamp=stampBounds&&stampSize?placement(stampBounds,stampX,zone.y+(markHeight-stampSize.height)/2,stampSize.width,stampSize.height):null;
  return{signature,stamp,markHeight};
}

const multiplyStates=new WeakMap<object,string>();
function useMultiplyBlend(doc:PDFKit.PDFDocument){
  const internal=doc as any;
  let name=multiplyStates.get(doc as object);
  if(!name){
    const state=internal.ref({Type:'ExtGState',BM:'Multiply'});
    state.end();
    name=`B33Multiply${state.id}`;
    multiplyStates.set(doc as object,name);
    internal.page.ext_gstates[name]=state;
  }else if(!internal.page.ext_gstates[name]){
    // Chaque page possède son propre dictionnaire de ressources.
    const registry=(internal as any)._b33MultiplyReference;
    if(registry)internal.page.ext_gstates[name]=registry;
  }
  const reference=internal.page.ext_gstates[name];
  if(reference)(internal as any)._b33MultiplyReference=reference;
  internal.addContent(`/${name} gs`);
}

/**
 * Dessine les marques dans la zone officielle du modèle courant.
 * Les deux fichiers restent des XObjects PDF indépendants : signature d'abord,
 * puis cachet en mode Multiply, avec un état graphique strictement borné.
 */
export function drawOfficialMarksInZone(doc:PDFKit.PDFDocument,marks:OfficialMarks|null|undefined,zone:OfficialMarkZone){
  if(!marks?.signatureBuffer&&!marks?.stampBuffer)return;
  const layout=calculateOfficialMarkPlacements(marks,zone);
  doc.save();
  doc.rect(zone.x,zone.y,zone.width,layout.markHeight).clip();
  if(marks.signatureBuffer&&layout.signature)try{const p=layout.signature;doc.image(marks.signatureBuffer,p.drawX,p.drawY,{width:p.drawWidth,height:p.drawHeight})}catch{}
  if(marks.stampBuffer&&layout.stamp)try{
    doc.save();
    try{
      useMultiplyBlend(doc);
      const p=layout.stamp;doc.image(marks.stampBuffer,p.drawX,p.drawY,{width:p.drawWidth,height:p.drawHeight});
    }finally{doc.restore()}
  }catch{}
  doc.restore();
  const identity=[documentText(marks.signatureIdentity),documentText(marks.signatureFunction)].filter(Boolean).join(' — ');
  if(identity)doc.fillColor(documentStyle.colors.text).font('Helvetica').fontSize(6.7).text(identity,zone.x+4,zone.y+layout.markHeight+5,{width:zone.width-8,height:18,align:'center',ellipsis:true});
}
