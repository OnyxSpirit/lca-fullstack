import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PNG} from 'pngjs';
import {renderVehicleDocumentData} from '../src/modules/documents/commercial-document.js';

const root=path.resolve('../docs/qualifications/qualification-lca-02/preuves/evo45');
const photosDir=path.join(root,'photographies');
const pdfDir=path.join(root,'pdf');
await Promise.all([mkdir(photosDir,{recursive:true}),mkdir(pdfDir,{recursive:true})]);

function photo(index:number){
  const image=new PNG({width:960,height:540});
  const colors=[[143,23,34],[30,64,175],[5,120,95],[180,83,9],[91,33,182],[8,105,130],[190,24,93],[55,65,81],[22,101,52],[125,65,25]];
  const [red,green,blue]=colors[index%colors.length]!;
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){const offset=(y*image.width+x)*4,shade=Math.round(35*x/image.width);image.data[offset]=Math.min(255,red+shade);image.data[offset+1]=Math.min(255,green+shade);image.data[offset+2]=Math.min(255,blue+shade);image.data[offset+3]=255}
  return PNG.sync.write(image);
}

const buffers:Buffer[]=[];
for(let index=0;index<10;index++){const buffer=photo(index);buffers.push(buffer);await writeFile(path.join(photosDir,`vehicule-${String(index+1).padStart(2,'0')}.png`),buffer)}

const identity={legalName:'La Congolaise de l’Automobile',tradeName:'LCA',agencyName:'Agence de qualification',agencyAddress:'Avenue de la Qualification',agencyCity:'Brazzaville',phone:'+242 00 000 00 00',email:'qualification@example.invalid',rccm:'RC-QA-001',taxIdentifier:'NIU-QA-001',rib:'RIB-QA-001',website:'https://qualification.invalid',logoCandidates:[]};
const base={id:'45001',stockNumber:'EVO45-QA-001',brand:'LCA',model:'Horizon',version:'Intégrale',vehicleType:'new',year:2026,bodyType:'SUV',color:'Rouge profond',interiorColor:'Noir',engine:'Moteur électrique synchrone',fuelType:'Électrique',transmission:'Automatique',fiscalPower:9,realPower:185,co2Emissions:0,mileage:18,firstRegistrationDate:null,vin:'EVO45QUALIFICATION001',registrationNumber:'QA-045-LCA',status:'available',agencyName:'Agence de qualification',locationName:'Showroom principal',locationType:'SHOWROOM',entryDate:'2026-11-25',salePrice:32500000,currencyCode:'XAF',supplierName:'Constructeur de qualification',notes:'Véhicule fictif utilisé exclusivement pour la qualification EVO-45.',features:['Caméra 360°','Climatisation automatique','Régulateur adaptatif','Aide au stationnement'],technicalValues:{technical_category:'SUV familial',configuration:'Cinq portes',displacement_cc:0,cylinder_count:0,powertrain_type:'Électrique',combined_power_kw:136,maximum_torque_nm:310,power_ch:185,acceleration_0_100_seconds:8.4,maximum_speed_kmh:180,electric_range_km:480,seat_count:5,interior_trim:'Cuir synthétique noir',tire_dimensions:'235/55 R19',drive_method:'Traction',gear_count:1,length_mm:4680,width_mm:1880,height_mm:1660,advanced_sensors:'Radar avant, caméra 360°, surveillance des angles morts',battery_cooling_function:'Refroidissement liquide piloté',central_screen_dashboard:'Écran central 12,3 pouces',remote_app_control:'Verrouillage et préconditionnement',embedded_technologies:'Navigation, appel d’urgence et mises à jour locales',connectivity:'Bluetooth et USB-C',safety_features:'ABS, ESP, six airbags',additional_specs:[{label:'Garde au sol',value:190,unit:'mm'},{label:'Capacité du coffre',value:520,unit:'l'}]}};

const complete=await renderVehicleDocumentData({...base,images:buffers.map((buffer,index)=>({id:String(index+1),path:`qualification-${index+1}.png`,isPrimary:index===0,buffer}))},identity,null);
await writeFile(path.join(pdfDir,'fiche-a4-vehicule-dix-photographies.pdf'),complete);
const noPhoto=await renderVehicleDocumentData({...base,stockNumber:'EVO45-QA-SANS-PHOTO',vin:null,registrationNumber:null,images:[]},identity,null);
await writeFile(path.join(pdfDir,'fiche-a4-vehicule-sans-photographie.pdf'),noPhoto);
const corrupted=await renderVehicleDocumentData({...base,stockNumber:'EVO45-QA-PHOTO-CORROMPUE',images:[{id:'bad',error:'Contenu image invalide'},{id:'good',buffer:buffers[0],isPrimary:true}]},identity,null);
await writeFile(path.join(pdfDir,'fiche-a4-vehicule-photographie-corrompue.pdf'),corrupted);
console.log(JSON.stringify({root,pdfs:3,photos:buffers.length,bytes:{complete:complete.length,noPhoto:noPhoto.length,corrupted:corrupted.length}},null,2));
