import{query}from'../config/database.js';
import{allowedScopesForPermission,historicalScopeDecision}from'../modules/rbac/permission-scope-policy.js';
import type{RowDataPacket}from'mysql2/promise';

const rows=await query<RowDataPacket[]>(`SELECT r.id role_id,r.code role_code,r.is_system,p.id permission_id,p.code permission_code,rp.scope old_scope
 FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id
 WHERE rp.scope IN ('CONCESSION','GLOBAL') ORDER BY r.is_system DESC,r.code,p.code`);
console.log('| Rôle | Permission | Ancien périmètre | Périmètres autorisés | Cible proposée | Impact |');
console.log('|---|---|---|---|---|---|');
for(const row of rows){
 const decision=historicalScopeDecision(String(row.permission_code),Boolean(row.is_system)),allowed=allowedScopesForPermission(String(row.permission_code)).filter(scope=>scope==='OWN'||scope==='AGENCY'),target=decision==='AGENCY'?'AGENCY':decision==='OWN_OR_REMOVE'?'OWN ou retrait':decision==='SYSTEM_PROTECTED'?'Aucune modification':'Retrait ou décision de politique',impact=decision==='AGENCY'?'Réduction vers les données de l’agence active':decision==='OWN_OR_REMOVE'?'Réduction aux seules données personnelles si OWN est approuvé':decision==='SYSTEM_PROTECTED'?'Rôle système protégé':'Aucune conversion automatique sûre';
 console.log(`| \`${row.role_code}\` | \`${row.permission_code}\` | \`${row.old_scope}\` | ${allowed.length?allowed.map(scope=>`\`${scope}\``).join(', '):'Aucun'} | ${target} | ${impact} |`);
}
