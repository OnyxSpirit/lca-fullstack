import{mkdir,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{renderCommercialDocument}from'../src/modules/documents/commercial-document.js';
import{PNG}from'pngjs';

const output=resolve(process.cwd(),'../docs/evolutions/evolution-lca-01/preuves');
await mkdir(output,{recursive:true});
const uploadRoot=resolve(process.env.UPLOAD_DIR??'uploads','vehicles');
await mkdir(uploadRoot,{recursive:true});
const identity={legalName:'LCA Qualification',tradeName:'LCA Qualification',agencyName:'Agence fictive',address:'Brazzaville',phone:'+242 00 000 00 00',email:'qualification@example.invalid',currencyCode:'XAF',logoCandidates:[]};
const header={agency_id:'1',number:'PF-QUALIFICATION-001',document_date:'24/11/2026',customer_name:'Client Fictif',customer_code:'CLI-QUALIFICATION',customer_phone:'+242 00 000 00 01',customer_email:'client@example.invalid',customer_address:'Adresse fictive',currency_code:'XAF',subtotal:25000000,discount_total:0,tax_total:0,total:25000000,tax_rate_snapshot:0,payment_terms:'Qualification uniquement',delivery_terms:'Selon commande',warranty_terms:'Garantie fictive'} as any;
const specs=(brand:string,model:string,vin:string)=>JSON.stringify({brand,model,version:'Qualification',vin,color:'Rouge',fuelType:'Essence',transmission:'Automatique'});
const paths=Array.from({length:8},(_,index)=>`/uploads/vehicles/00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}.png`);
for(const[index,publicPath]of paths.entries()){const image=new PNG({width:600,height:320}),color=[143,(23+index*27)%220,(34+index*41)%220];for(let offset=0;offset<image.data.length;offset+=4){const x=(offset/4)%600,y=Math.floor(offset/4/600),stripe=(x+y+index*35)%120<18?38:0;image.data[offset]=Math.min(255,color[0]+stripe);image.data[offset+1]=Math.min(255,color[1]+stripe);image.data[offset+2]=Math.min(255,color[2]+stripe);image.data[offset+3]=255}await writeFile(resolve(uploadRoot,publicPath.split('/').at(-1)!),PNG.sync.write(image))}
const line=(id:number,vehicleId:string,description:string,images:string[])=>({id,vehicle_id:vehicleId,commercial_model_id:null,description,quantity:1,unit_price:25000000,discount:0,tax_rate:0,line_total:25000000,technical_specs_snapshot:specs(description.split(' ')[0]!,description.split(' ')[1]!,`VIN-QUAL-${vehicleId}`),selected_images_snapshot:JSON.stringify(images)} as any);
const proofs=[
 ['proforma-vehicule-une-photo.pdf',[line(1,'1','Toyota Corolla',paths.slice(0,1))]],
 ['proforma-vehicule-huit-photos.pdf',[line(1,'1','Toyota Corolla',paths)]],
 ['proforma-trois-vehicules.pdf',[line(1,'1','Toyota Corolla',paths.slice(0,3)),line(2,'2','Toyota Hilux',paths.slice(3,5)),line(3,'3','Suzuki Swift',paths.slice(5,8))]],
]as const;
for(const[name,items]of proofs){const total=25000000*items.length;await writeFile(resolve(output,name),await renderCommercialDocument('FACTURE PRO FORMA',{...header,subtotal:total,total},items as any,identity))}
console.log(proofs.map(([name])=>resolve(output,name)).join('\n'));
