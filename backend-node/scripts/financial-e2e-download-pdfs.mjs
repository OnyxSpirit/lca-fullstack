import {mkdir,writeFile} from 'node:fs/promises';
import {generate} from 'otplib';

const base=process.env.FIN_E2E_API_URL??'http://127.0.0.1:3005/api',email=process.env.FIN_E2E_ADMIN_EMAIL,password=process.env.FIN_E2E_ADMIN_PASSWORD,secret=process.env.FIN_E2E_TOTP_SECRET;
const output=process.env.FIN_E2E_PDF_OUTPUT??'/tmp/lca-financial-pdfs';
if(!email||!password||!secret)throw new Error('Identifiants FIN_E2E requis');
const json=async(path,options={})=>{const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers??{})}}),body=await response.json();if(!response.ok)throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);return body};
const login=await json('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
const verified=await json('/auth/2fa/verify',{method:'POST',body:JSON.stringify({challengeToken:login.challengeToken,code:await generate({secret})})});
const headers={Authorization:`Bearer ${verified.accessToken}`};
await json('/rbac/agency-context',{method:'PUT',headers,body:JSON.stringify({agencyId:process.env.FIN_E2E_AGENCY_ID??'1'})});
const invoiceId=process.env.FIN_E2E_INVOICE_ID??'1';
const paymentId=process.env.FIN_E2E_PAYMENT_ID??'1';
const repairOrderId=process.env.FIN_E2E_REPAIR_ORDER_ID;
const files=[
  ['facture.pdf',`/invoices/${invoiceId}/pdf`],
  ['recu.pdf',`/payments/${paymentId}/receipt`],
  ...(repairOrderId?[['ordre-reparation-sav.pdf',`/repair-orders/${repairOrderId}/pdf`]]:[]),
  ['rapport-financier.pdf',`/reports/financial-dashboard/export/pdf?from=${new Date().toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}&mode=detailed`],
];
await mkdir(output,{recursive:true});
for(const[name,path]of files){const response=await fetch(`${base}${path}`,{headers});if(!response.ok)throw new Error(`${path}: ${response.status} ${await response.text()}`);const data=Buffer.from(await response.arrayBuffer());if(data.subarray(0,4).toString()!=='%PDF')throw new Error(`${path}: contenu non PDF`);await writeFile(`${output}/${name}`,data);}
console.log(JSON.stringify({output,files:files.map(([name])=>name)}));
