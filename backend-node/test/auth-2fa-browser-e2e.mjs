import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { generate } from 'otplib';

const baseUrl=process.env.LCA_E2E_ORIGIN,email=process.env.LCA_E2E_EMAIL,password=process.env.LCA_E2E_PASSWORD;
if(!baseUrl||!email||!password)throw new Error('LCA_E2E_ORIGIN, LCA_E2E_EMAIL et LCA_E2E_PASSWORD sont requis');
const port=19000+(process.pid%1000),profile=`/tmp/lca-auth-e2e-chromium-${process.pid}`;
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
  try{await waitFor(`document.readyState==='complete'&&!!document.querySelector('input[type=email]')`)}catch(error){const state=await evaluate(`({path:location.pathname,url:location.href,text:document.body?.innerText?.slice(0,600),ready:document.readyState})`);throw new Error(`Formulaire de connexion absent: ${JSON.stringify(state)}`,{cause:error})}
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
  await command('Page.navigate',{url:`${baseUrl}/security/2fa`});
  await waitFor(`location.pathname==='/security/2fa'&&document.body.innerText.includes('Centre de sécurité 2FA')`);
  const expectedTabs=['Vue d’ensemble','Paramètres généraux','Politiques par rôle','Politiques individuelles','Appareils de confiance','Mes appareils'];
  const tabs=await evaluate(`[...document.querySelectorAll('[role=tab]')].map(x=>x.textContent.trim())`);
  assert.deepEqual(tabs,expectedTabs);
  const sectionText={'Vue d’ensemble':'Utilisateurs avec 2FA actif','Paramètres généraux':'Politique de sécurité','Politiques par rôle':'Politiques 2FA par rôle','Politiques individuelles':'Utilisateurs actifs limités','Appareils de confiance':'Tous les états','Mes appareils':'Mes appareils de confiance'};
  const sectionFailures=[];
  for(const label of expectedTabs){await evaluate(`(()=>{[...document.querySelectorAll('[role=tab]')].find(x=>x.textContent.trim()===${JSON.stringify(label)}).click();return true})()`);try{await waitFor(`document.querySelector('[role=tab][aria-selected=true]')?.textContent.trim()===${JSON.stringify(label)}&&document.body.innerText.includes(${JSON.stringify(sectionText[label])})`)}catch{const state=await evaluate(`({selected:document.querySelector('[role=tab][aria-selected=true]')?.textContent.trim(),path:location.pathname+location.search,personal:document.body.innerText.includes('Mes appareils de confiance'),administration:document.body.innerText.includes('Administration des appareils de confiance')})`);sectionFailures.push({label,state})}}
  await evaluate(`(()=>{[...document.querySelectorAll('[role=tab]')].find(x=>x.textContent.trim()==='Politiques par rôle').click();return true})()`);
  await waitFor(`!!document.querySelector('input[aria-label="Rechercher un rôle"]')`);
  await evaluate(`(()=>{const fill=${fill};fill(document.querySelector('input[aria-label="Rechercher un rôle"]'),'LOT6C');return true})()`);
  await waitFor(`document.body.innerText.includes('LOT6C_POLICY')`);
  await evaluate(`(()=>{document.querySelector('[role=tab]').focus();return document.activeElement===document.querySelector('[role=tab]')})()`);
  await command('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  const responsive=await evaluate(`({viewport:innerWidth,bodyOverflow:document.documentElement.scrollWidth<=innerWidth,tablist:!!document.querySelector('[role=tablist]')})`);
  assert.deepEqual(responsive,{viewport:375,bodyOverflow:true,tablist:true});
  await command('Emulation.clearDeviceMetricsOverride');
  await command('Page.navigate',{url:`${baseUrl}/security/devices/me`});await waitFor(`location.pathname==='/security/2fa'&&location.search.includes('section=mine')`);
  await command('Page.navigate',{url:`${baseUrl}/security/devices`});await waitFor(`location.pathname==='/security/2fa'&&location.search.includes('section=devices')`);
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
  console.log(JSON.stringify({result:sectionFailures.length?'FAIL':'PASS',loginSetup:true,tokensPublishedAfterRecoveryAcknowledgement:true,authMe:authenticated.me,directory:authenticated.directory,dashboard:true,reload:true,moduleNavigation:navigation.path,securityCenterTabs:tabs,sectionFailures,dynamicRoleSearch:true,responsive:true,keyboardFocus:true,legacyRedirects:true,logout:true,loginVerifyWithoutQr:true,verifyMe}));
  if(sectionFailures.length)process.exitCode=1;
}finally{
  try{socket?.close()}catch{}
  browser.kill('SIGTERM');
}
