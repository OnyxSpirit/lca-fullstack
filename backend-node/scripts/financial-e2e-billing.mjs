import {generate} from 'otplib';
const base=process.env.FIN_E2E_API_URL??'http://127.0.0.1:3005/api',email=process.env.FIN_E2E_ADMIN_EMAIL,password=process.env.FIN_E2E_ADMIN_PASSWORD,secret=process.env.FIN_E2E_TOTP_SECRET;
if(!email||!password||!secret)throw new Error('Identifiants FIN_E2E requis');
const request=async(path,options={})=>{const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers??{})}}),body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`${options.method??'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`);return body};
const authenticate=async()=>{const login=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});return request('/auth/2fa/verify',{method:'POST',body:JSON.stringify({challengeToken:login.challengeToken,code:await generate({secret})})})};
let verified;try{verified=await authenticate()}catch(error){if(!String(error).includes('401'))throw error;await new Promise(resolve=>setTimeout(resolve,30000-Date.now()%30000+1000));verified=await authenticate()}
const auth=(path,options={})=>request(path,{...options,headers:{Authorization:`Bearer ${verified.accessToken}`,...(options.headers??{})}}),post=(path,body)=>auth(path,{method:'POST',body:JSON.stringify(body)}),patch=(path,body)=>auth(path,{method:'PATCH',body:JSON.stringify(body)});
const customers=await auth('/customers?page=1&pageSize=100');let customer=(Array.isArray(customers)?customers:customers.items??customers.data??[]).find(x=>x.email==='multimode.finance@lca.test');
if(!customer)customer=await post('/customers',{customerType:'individual',civility:'M.',firstName:'Client',lastName:'Multimode',email:'multimode.finance@lca.test',phone:'+242060000002',country:'Congo'});
const created=await post('/invoices',{customerId:String(customer.id),invoiceType:'manual',issueDate:'2026-11-16',dueDate:'2026-11-30',taxMode:'TAX_EXEMPT',priceInputMode:'HT',taxRate:0,items:[{description:'Prestation financière multimode E2E',quantity:1,unitPrice:400000,discount:0}],notes:'Recette E2E A, B et C',idempotencyKey:'fin-e2e-invoice-multimode-001'});
await patch(`/invoices/${created.id}/status`,{status:'issued'});
let invoice=await auth(`/invoices/${created.id}`);
const prefix=String(customer.agencyId??customer.agency_id)==='1'?'FIN_BZV':'FIN_PNR',modes=[['1',`${prefix}_CAISSE`,'ESPECES'],['2',`${prefix}_BANQUE`,'CARTE'],['3',`${prefix}_BANQUE`,'VIREMENT'],['5',`${prefix}_BANQUE`,'MOBILE']];
const accounts=await auth('/treasury/accounts'),accountByCode=Object.fromEntries(accounts.map(x=>[x.code,String(x.id)])),payments=[];
for(let index=0;index<modes.length;index++){
  const[method,accountCode,label]=modes[index],amount=100000;
  const payment=await post(`/invoices/${created.id}/payments`,{paymentMethodId:method,treasuryAccountId:accountByCode[accountCode],amount,paymentDate:'2026-11-16',reference:`FIN-E2E-${label}-001`,notes:`Encaissement ${label}`,idempotencyKey:`fin-e2e-payment-${label.toLowerCase()}-001`});
  payments.push(payment);invoice=await auth(`/invoices/${created.id}`);
}
console.log(JSON.stringify({invoice:{id:String(invoice.id),number:invoice.invoice_number,status:invoice.status,total:Number(invoice.total),amountPaid:Number(invoice.amount_paid),balanceDue:Number(invoice.balance_due),archiveStatus:invoice.archive_status},payments},null,2));
