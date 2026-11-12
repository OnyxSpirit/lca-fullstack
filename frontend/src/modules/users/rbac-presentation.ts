import type{RbacScope}from'../../api/userHooks';

export const BUSINESS_SCOPES=['OWN','AGENCY']as const satisfies readonly RbacScope[];
export const isBusinessScope=(scope:RbacScope):scope is 'OWN'|'AGENCY'=>BUSINESS_SCOPES.includes(scope as 'OWN'|'AGENCY');
export const businessScopesForPermission=(allowedScopes:readonly RbacScope[])=>allowedScopes.filter(isBusinessScope);
export const isIncompatibleBusinessScope=(scope:RbacScope|null|undefined,allowedScopes:readonly RbacScope[])=>scope!=null&&(!isBusinessScope(scope)||!allowedScopes.includes(scope));
export const scopeLabel=(scope:RbacScope)=>({OWN:'Mes données',AGENCY:'Agence',CONCESSION:'Ancien périmètre concession',GLOBAL:'Ancien périmètre global'})[scope];

const labels:Record<string,string>={
 settings:'Paramètres',billing:'Facturation',workshop:'Atelier',inventory:'Stock',users:'Utilisateurs',roles:'Rôles et permissions',notifications:'Notifications',documents:'Documents',document:'Documents',delivery:'Livraison',deliveries:'Livraison',sales:'Ventes',vehicles:'Véhicules',customers:'Clients',customer:'Clients',reporting:'Rapports',reports:'Rapports',treasury:'Trésorerie',hr:'Ressources humaines',parts:'Pièces de rechange',crm:'CRM',showroom:'Showroom',security:'Sécurité',auth:'Sécurité du compte',agencies:'Agences',agency:'Agences',permissions:'Permissions',general:'Général',stamp:'Cachets',stamps:'Cachets',service:'Service après-vente',sav:'Service après-vente',
};
const words=(value:string)=>value.trim().split(/[.·/_\s-]+/).filter(Boolean);
const translate=(value:string)=>words(value).map(word=>labels[word.toLowerCase()]??word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()).join(' ');
export const permissionGroupLabel=(module:string,group?:string|null)=>{
 const moduleLabel=translate(module),groupLabel=group?translate(group):'';
 if(!groupLabel||groupLabel.toLocaleLowerCase('fr')===moduleLabel.toLocaleLowerCase('fr'))return moduleLabel;
 const moduleWords=new Set(words(moduleLabel).map(word=>word.toLocaleLowerCase('fr'))),distinct=words(groupLabel).filter(word=>!moduleWords.has(word.toLocaleLowerCase('fr')));
 return distinct.length?distinct.join(' '):moduleLabel;
};
export const roleDisplayName=(code:string,name:string)=>code==='SUPER_ADMIN'?'Super Administrateur':name;
