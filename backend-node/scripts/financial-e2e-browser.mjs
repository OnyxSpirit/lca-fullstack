import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const playwrightPath=process.env.PLAYWRIGHT_CORE_PATH??'/tmp/lca-playwright/node_modules/playwright-core/index.mjs';
const {chromium}=await import(pathToFileURL(playwrightPath));
const base=process.env.FIN_E2E_FRONTEND_URL??'http://127.0.0.1:4177';
const api=process.env.FIN_E2E_API_URL??'http://127.0.0.1:3005/api';
const password=process.env.FIN_E2E_USER_PASSWORD??'Recette.Finance-2026!';
const evidence=process.env.FIN_E2E_BROWSER_EVIDENCE??'../docs/recettes/cloture-facturation-comptabilite-tresorerie/preuves-navigateur';
await mkdir(evidence,{recursive:true});

const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const results=[];
const profileStates=new Map();
const forbidden=/\b(Treasury|Billing|Accounting|Payment|Refund|Credit note|Ledger|Trial balance|Bank reconciliation|Posted|Pending|Draft)\b/i;

async function login(page,email){
  await page.goto(`${base}/login`,{waitUntil:'networkidle'});
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button',{name:/Se connecter/}).click();
  try{await page.waitForURL(url=>!url.pathname.endsWith('/login'),{timeout:15000})}catch(error){throw new Error(`Connexion UI ${email} impossible: ${(await page.locator('body').innerText()).slice(-500)}`,{cause:error})}
}

async function officialSession(email){
  if(profileStates.has(email))return profileStates.get(email);
  const response=await fetch(`${api}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const authenticated=await response.json();
  if(!response.ok||authenticated.status!=='authenticated')throw new Error(`Session officielle impossible pour ${email}: ${response.status} ${JSON.stringify(authenticated)}`);
  const profile=authenticated.user,roles=profile.roles,primaryRole=profile.role.code||roles[0]||'';
  const user={id:profile.id,name:`${profile.firstName} ${profile.lastName}`,email:profile.email,role:primaryRole,roles,primaryRole,roleCode:profile.role.code,roleTitle:profile.role.code.replaceAll('_',' '),avatar:profile.avatar??'',agencyId:profile.agencyId,agencyName:profile.agencyName,department:'',phone:'',status:'active',isSystemSuperAdmin:Boolean(profile.role.isSystemSuperAdmin),permissions:Object.fromEntries(profile.permissions.map(({code,scope})=>[code,scope]))};
  const state={cookies:[],origins:[{origin:base,localStorage:[{name:'lca-access-token',value:authenticated.accessToken},{name:'lca-refresh-token',value:authenticated.refreshToken},{name:'lca-auth-user',value:JSON.stringify(user)}]}]};
  profileStates.set(email,state);return state;
}

async function visit(profile,path,heading,screenshot,interaction){
  const context=await browser.newContext({viewport:profile.viewport??{width:1440,height:1000},acceptDownloads:true,storageState:await officialSession(profile.email)});
  const page=await context.newPage(),failures=[];
  page.on('response',response=>{if(response.url().includes('/api/')&&response.status()>=500)failures.push({status:response.status(),url:response.url()})});
  page.on('pageerror',error=>failures.push({pageError:error.message}));
  await page.goto(`${base}${path}`,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:heading}).waitFor({state:'visible',timeout:15000});
  if(interaction)await interaction(page);
  const text=await page.locator('body').innerText();
  const untranslated=text.match(forbidden)?.[0]??null;
  const untranslatedContext=untranslated?text.slice(Math.max(0,text.toLowerCase().indexOf(untranslated.toLowerCase())-80),text.toLowerCase().indexOf(untranslated.toLowerCase())+untranslated.length+80).replaceAll('\n',' · '):null;
  await page.screenshot({path:`${evidence}/${screenshot}`,fullPage:true});
  results.push({profile:profile.email,path,heading,visible:true,untranslated,untranslatedContext,serverOrPageFailures:failures,viewport:profile.viewport??{width:1440,height:1000}});
  if(failures.length)throw new Error(`${path}: erreurs navigateur/API ${JSON.stringify(failures)}`);
  if(untranslated)throw new Error(`${path}: libellé anglais visible « ${untranslated} » dans « ${untranslatedContext} »`);
  await context.close();
}

try{
  await visit({email:'resp.facturation@lca.test'},'/billing','Facturation, Encaissements & Règlements','facturation-desktop.png',async page=>{
    await page.getByPlaceholder('Facture, client, vente ou OR').fill('FAC-LCAPNR');
    await page.waitForTimeout(400);
    await page.getByPlaceholder('Facture, client, vente ou OR').fill('');
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:/Exporter les opérations de facturation/}).click();
    const file=await download;
    if(!file.suggestedFilename().endsWith('.csv'))throw new Error('Export Facturation inattendu');
  });
  await visit({email:'resp.facturation@lca.test',viewport:{width:390,height:844}},'/billing','Facturation, Encaissements & Règlements','facturation-mobile.png');
  await visit({email:'tresorerie@lca.test'},'/treasury/operations','Comptabilité & Trésorerie','tresorerie-desktop.png',async page=>{
    await page.getByRole('tab',{name:'Journal financier'}).click();
    await page.waitForTimeout(300);
  });
  await visit({email:'tresorerie@lca.test',viewport:{width:768,height:1024}},'/treasury','Centre de pilotage financier','tableau-financier-tablette.png');
  await visit({email:'comptable@lca.test'},'/treasury/accounting','Comptabilité générale','comptabilite-desktop.png',async page=>{
    await page.getByRole('tab',{name:'Grand livre & balances'}).click();
    await page.getByText(/Grand livre/).first().waitFor({state:'visible'});
    await page.getByRole('tab',{name:'Intégrations'}).click();
    await page.getByPlaceholder('Référence ou libellé').waitFor({state:'visible'});
  });
  console.log(JSON.stringify({status:'PASSED',results},null,2));
}finally{
  await browser.close();
}
