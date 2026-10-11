import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3004/api';
const login=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});
if(!login.ok)throw new Error(`login ${login.status}`);
const {accessToken}=await login.json();
const results=[];
for(const path of ['/invoices?page=1&pageSize=7&billingAgencyId=1','/invoices?page=1&pageSize=7&billingAgencyId=2','/invoices?page=2&pageSize=7&billingAgencyId=2','/invoices?page=1&pageSize=7&billingAgencyId=3','/invoices?page=1&pageSize=7&billingAgencyId=2&type=workshop','/invoices?page=1&pageSize=7&billingAgencyId=2&search=REC15','/invoices/16','/repair-orders/7','/sales/10','/sales/11','/deliveries/6']){
 const response=await fetch(base+path,{headers:{authorization:`Bearer ${accessToken}`}}),data=await response.json();
 results.push({path,status:response.status,data});
 console.log(JSON.stringify({path,status:response.status,total:data.total,page:data.page,ids:data.items?.map(x=>x.id),id:data.id,state:data.status}));
}
await writeFile('/tmp/erp17-api.json',JSON.stringify(results,null,2));
