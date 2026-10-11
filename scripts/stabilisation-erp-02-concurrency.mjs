const base=process.env.RECETTE_API_URL??'http://127.0.0.1:3004/api';
const email=process.env.ADMIN_EMAIL,password=process.env.ADMIN_PASSWORD;
if(!email||!password)throw new Error('Variables de recette manquantes');
async function request(path,{method='GET',token,body,expected=[200]}={}){const started=performance.now(),response=await fetch(base+path,{method,headers:{...(token?{authorization:`Bearer ${token}`} :{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),data=await response.json().catch(()=>null),ms=Math.round((performance.now()-started)*100)/100;if(!expected.includes(response.status))throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);return{status:response.status,data,ms};}
const login=await request('/auth/login',{method:'POST',body:{email,password}}),token=login.data.accessToken;
const roles=(await request('/roles',{token})).data,users=(await request('/users',{token})).data;
const role=roles.find(row=>row.code==='DIRECTION'),user=users.find(row=>row.email==='recette.technicien@lca-test.cg'),superAdmin=users.find(row=>row.email===email);
const detail=(await request(`/roles/${role.id}/permissions`,{token})).data,permissions=detail.permissions.map(p=>({permissionId:String(p.id),scope:p.scope}));
const roleWrites=await Promise.all([
  request(`/roles/${role.id}`,{method:'PATCH',token,body:{description:'Concurrence écriture A',permissions}}),
  request(`/roles/${role.id}`,{method:'PATCH',token,body:{description:'Concurrence écriture B',permissions}}),
]);
const roleAfter=(await request(`/roles/${role.id}/permissions`,{token})).data;
await request(`/roles/${role.id}`,{method:'PATCH',token,body:{description:'Profil dynamique de recette DIRECTION',permissions}});
const userWrites=await Promise.all([
  request(`/users/${user.id}`,{method:'PATCH',token,body:{phone:'+242060000001'}}),
  request(`/users/${user.id}`,{method:'PATCH',token,body:{jobTitle:'Technicien recette concurrent'}}),
]);
const userAfter=(await request(`/users/${user.id}`,{token})).data;
await request(`/users/${user.id}`,{method:'PATCH',token,body:{phone:null,jobTitle:'Technicien'}});
const lastAdmin=await Promise.all([
  request(`/users/${superAdmin.id}/status`,{method:'PATCH',token,body:{isActive:false},expected:[409]}),
  request(`/users/${superAdmin.id}/status`,{method:'PATCH',token,body:{isActive:false},expected:[409]}),
]);
console.log(JSON.stringify({generatedAt:new Date().toISOString(),roleWrites:roleWrites.map(x=>({status:x.status,ms:x.ms})),roleAfter:{description:roleAfter.description,permissions:roleAfter.permissions.length,uniquePermissions:new Set(roleAfter.permissions.map(p=>`${p.id}:${p.scope}`)).size},userWrites:userWrites.map(x=>({status:x.status,ms:x.ms})),userAfter:{phone:userAfter.phone,jobTitle:userAfter.jobTitle},lastAdmin:lastAdmin.map(x=>({status:x.status,ms:x.ms}))},null,2));
