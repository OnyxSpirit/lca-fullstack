import{generate}from'otplib';
const base=process.env.FIN_E2E_API_URL??'http://127.0.0.1:3005/api',email=process.env.FIN_E2E_ADMIN_EMAIL,password=process.env.FIN_E2E_ADMIN_PASSWORD,secret=process.env.FIN_E2E_TOTP_SECRET,invoiceId=process.env.FIN_E2E_INVOICE_ID??'2',paymentId=process.env.FIN_E2E_PAYMENT_ID??'2';
if(!email||!password||!secret)throw new Error('Identifiants FIN_E2E requis');
const request=async(path,options={})=>{const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers??{})}}),body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`${options.method??'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`);return body};
const authenticate=async()=>{const login=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});return request('/auth/2fa/verify',{method:'POST',body:JSON.stringify({challengeToken:login.challengeToken,code:await generate({secret})})})};
let verified;try{verified=await authenticate()}catch(error){if(!String(error).includes('401'))throw error;await new Promise(resolve=>setTimeout(resolve,30000-Date.now()%30000+1000));verified=await authenticate()}
const post=(path,body)=>request(path,{method:'POST',headers:{Authorization:`Bearer ${verified.accessToken}`},body:JSON.stringify(body)});
const creditPartial=await post(`/invoices/${invoiceId}/credit-notes`,{amount:60000,reason:'Avoir partiel de recette E2E',issueDate:'2026-11-16',idempotencyKey:'fin-e2e-credit-partial-001'});
const refundPartial=await post(`/payments/${paymentId}/refund`,{creditNoteId:creditPartial.id,amount:60000,reason:'Remboursement partiel de recette E2E',idempotencyKey:'fin-e2e-refund-partial-001'});
const creditConcurrent=await post(`/invoices/${invoiceId}/credit-notes`,{amount:40000,reason:'Avoir de concurrence E2E',issueDate:'2026-11-16',idempotencyKey:'fin-e2e-credit-concurrent-001'});
const concurrentBody={creditNoteId:creditConcurrent.id,amount:40000,reason:'Remboursement concurrent de recette E2E',idempotencyKey:'fin-e2e-refund-concurrent-001'};
const concurrent=await Promise.all([post(`/payments/${paymentId}/refund`,concurrentBody),post(`/payments/${paymentId}/refund`,concurrentBody)]);
console.log(JSON.stringify({creditPartial,refundPartial,creditConcurrent,concurrent},null,2));
