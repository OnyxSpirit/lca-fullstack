import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { generate } from 'otplib';

const baseUrl=process.env.LCA_E2E_ORIGIN,email=process.env.LCA_E2E_EMAIL,password=process.env.LCA_E2E_PASSWORD;
if(!baseUrl||!email||!password)throw new Error('LCA_E2E_ORIGIN, LCA_E2E_EMAIL et LCA_E2E_PASSWORD sont requis');
const port=19223,profile=`/tmp/lca-auth-e2e-chromium-${process.pid}`;
const browser=spawn('/snap/bin/chromium',['--headless=new','--no-sandbox',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--disable-gpu','--disable-dev-shm-usage','about:blank'],{stdio:'ignore'});
browser.on('error',()=>{});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const nextTotpWindow=()=>sleep((31-(Math.floor(Date.now()/1000)%30))*1000);
async function retry(work,timeout=15_000){const end=Date.now()+timeout;let error;while(Date.now()<end){try{return await work()}catch(e){error=e;await sleep(150)}}throw error??new Error('Timeout')}
let socket;
try{
  const version=await retry(async()=>{const response=await fetch(`http://127.0.0.1:${port}/json/version`);if(!response.ok)throw new Error('CDP indisponible');return response.json()});
  const target=await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/login`)}`,{method:'PUT'})).json();
  socket=new WebSocket(target.webSocketDebuggerUrl??version.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  let sequence=0;const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id)return;const waiter=pending.get(message.id);if(!waiter)return;pending.delete(message.id);message.error?waiter.reject(new Error(message.error.message)):waiter.resolve(message.result)});
  const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
  const evaluate=async expression=>(await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result.value;
  const waitFor=async expression=>retry(async()=>{const value=await evaluate(expression);if(!value)throw new Error(`Condition non satisfaite: ${expression}`);return value},20_000);
  await command('Runtime.enable');await command('Page.enable');
  await waitFor(`document.readyState==='complete'&&!!document.querySelector('input[type=email]')`);
  const fill=`(element,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}))}`;
  await evaluate(`(()=>{const fill=${fill};fill(document.querySelector('input[type=email]'),${JSON.stringify(email)});fill(document.querySelector('input[type=password]'),${JSON.stringify(password)});document.querySelector('form').requestSubmit();return true})()`);
  try{await waitFor(`document.body.innerText.includes('Configurer la double authentification')&&!!document.querySelector('code')`)}catch(error){const state=await evaluate(`({path:location.pathname,text:document.body.innerText.slice(0,600)})`);throw new Error(`Enrôlement navigateur absent: ${JSON.stringify(state)}`,{cause:error})}
  const secret=await evaluate(`document.querySelector('code').textContent.trim()`);
  assert.equal(typeof secret,'string');assert.ok(secret.length>=16);
  const code=await generate({secret,algorithm:'sha1',digits:6,period:30});
  await evaluate(`(()=>{const fill=${fill};const input=document.querySelector('input[inputmode=numeric]');fill(input,${JSON.stringify(code)});input.closest('form').requestSubmit();return true})()`);
  await waitFor(`document.body.innerText.includes('Codes de récupération')`);
  const prePublish=await evaluate(`({access:localStorage.hasOwnProperty('lca-access-token'),refresh:localStorage.hasOwnProperty('lca-refresh-token')})`);
  assert.deepEqual(prePublish,{access:false,refresh:false});
  await evaluate(`(()=>{document.querySelector('input[type=checkbox]').click();[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Accéder à l’ERP')).click();return true})()`);
  await waitFor(`location.pathname==='/dashboard'&&localStorage.getItem('lca-access-token')&&document.body.innerText.length>100`);
  const authenticated=await evaluate(`(async()=>{const token=localStorage.getItem('lca-access-token'),refresh=localStorage.getItem('lca-refresh-token');const me=await fetch('/api/auth/me',{headers:{Authorization:'Bearer '+token}});const directory=await fetch('/api/users/directory',{headers:{Authorization:'Bearer '+token}});return{path:location.pathname,access:Boolean(token),refresh:Boolean(refresh),me:me.status,directory:directory.status}})()`);
  assert.deepEqual(authenticated,{path:'/dashboard',access:true,refresh:true,me:200,directory:200});
  await command('Page.reload',{ignoreCache:true});
  await waitFor(`location.pathname==='/dashboard'&&!!localStorage.getItem('lca-access-token')&&document.body.innerText.length>100`);
  await command('Page.navigate',{url:`${baseUrl}/users`});
  await waitFor(`location.pathname==='/users'&&document.body.innerText.length>100`);
  const navigation=await evaluate(`({path:location.pathname,loginVisible:document.body.innerText.includes('Accédez à votre environnement de travail.')})`);
  assert.deepEqual(navigation,{path:'/users',loginVisible:false});
  const logout=await evaluate(`(async()=>{const access=localStorage.getItem('lca-access-token'),refresh=localStorage.getItem('lca-refresh-token');const response=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+access},body:JSON.stringify({refreshToken:refresh})});localStorage.clear();location.assign('/login');return response.status})()`);
  assert.equal(logout,200);
  await waitFor(`location.pathname==='/login'&&!!document.querySelector('input[type=email]')`);
  await evaluate(`(()=>{const fill=${fill};fill(document.querySelector('input[type=email]'),${JSON.stringify(email)});fill(document.querySelector('input[type=password]'),${JSON.stringify(password)});document.querySelector('form').requestSubmit();return true})()`);
  await waitFor(`document.body.innerText.includes('Vérification de sécurité')&&!!document.querySelector('input[inputmode=numeric]')`);
  assert.equal(await evaluate(`document.body.innerText.includes('Scannez ce QR code')`),false);
  await nextTotpWindow();
  const verifyCode=await generate({secret,algorithm:'sha1',digits:6,period:30});
  await evaluate(`(()=>{const fill=${fill};const input=document.querySelector('input[inputmode=numeric]');fill(input,${JSON.stringify(verifyCode)});input.closest('form').requestSubmit();return true})()`);
  await waitFor(`location.pathname==='/dashboard'&&!!localStorage.getItem('lca-access-token')`);
  const verifyMe=await evaluate(`fetch('/api/auth/me',{headers:{Authorization:'Bearer '+localStorage.getItem('lca-access-token')}}).then(response=>response.status)`);
  assert.equal(verifyMe,200);
  console.log(JSON.stringify({result:'PASS',loginSetup:true,tokensPublishedAfterRecoveryAcknowledgement:true,authMe:authenticated.me,directory:authenticated.directory,dashboard:true,reload:true,moduleNavigation:navigation.path,logout:true,loginVerifyWithoutQr:true,verifyMe}));
}finally{
  try{socket?.close()}catch{}
  browser.kill('SIGTERM');
}
