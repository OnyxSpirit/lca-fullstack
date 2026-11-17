import type{RbacScope}from'../../api/userHooks';

export const BUSINESS_SCOPES=['OWN','AGENCY']as const satisfies readonly RbacScope[];
export const isBusinessScope=(scope:RbacScope):scope is 'OWN'|'AGENCY'=>BUSINESS_SCOPES.includes(scope as 'OWN'|'AGENCY');
export const businessScopesForPermission=(allowedScopes:readonly RbacScope[])=>allowedScopes.filter(isBusinessScope);
export const isIncompatibleBusinessScope=(scope:RbacScope|null|undefined,allowedScopes:readonly RbacScope[])=>scope!=null&&(!isBusinessScope(scope)||!allowedScopes.includes(scope));
export const scopeLabel=(scope:RbacScope)=>({OWN:'Mes données',AGENCY:'Agence'})[scope];

const labels:Record<string,string>={
 settings:'Paramètres',billing:'Facturation',workshop:'Atelier',inventory:'Stock',users:'Utilisateurs',roles:'Rôles et permissions',notifications:'Notifications',documents:'Documents',document:'Documents',delivery:'Livraison',deliveries:'Livraison',sales:'Ventes',vehicles:'Véhicules',customers:'Clients',customer:'Clients',reporting:'Rapports',reports:'Rapports',treasury:'Trésorerie',hr:'Ressources humaines',parts:'Pièces de rechange',crm:'CRM',showroom:'Showroom',security:'Sécurité',auth:'Sécurité du compte',agencies:'Agences',agency:'Agences',permissions:'Permissions',general:'Général',stamp:'Cachets',stamps:'Cachets',service:'Service après-vente',sav:'Service après-vente',accounting:'Comptabilité',activity:'Journal d’activité',bank:'Banque',reconciliation:'Rapprochement',bank_reconciliation:'Rapprochement bancaire',proformas:'Factures pro forma',quotations:'Devis',ged:'GED',fiscal:'Fiscalité',supplier:'Fournisseurs',finance:'Finances',supplier_finance:'Finances fournisseurs',
 'achats & finance':'Achats et finances','comptabilité & trésorerie':'Comptabilité et trésorerie','documents & gouvernance':'Documents et gouvernance','identité & fiscalité':'Identité et fiscalité','paramètres · agences':'Agences','pièces & stock':'Pièces et stock','rh & administration':'RH et administration','sécurité et authentification':'Sécurité et authentification','service après vente & atelier':'Service après-vente et atelier',
};
const words=(value:string)=>value.trim().split(/[.·/_\s-]+/).filter(Boolean);
const translate=(value:string)=>labels[value.trim().toLowerCase()]??words(value).map(word=>labels[word.toLowerCase()]??word.charAt(0).toUpperCase()+word.slice(1).toLowerCase()).join(' ');
export const permissionGroupLabel=(module:string,group?:string|null)=>{
 const moduleLabel=translate(module),groupLabel=group?translate(group):'';
 if(!groupLabel||groupLabel.toLocaleLowerCase('fr')===moduleLabel.toLocaleLowerCase('fr'))return moduleLabel;
 return groupLabel;
};
export const roleDisplayName=(code:string,name:string)=>code==='SUPER_ADMIN'?'Super Administrateur':name;
