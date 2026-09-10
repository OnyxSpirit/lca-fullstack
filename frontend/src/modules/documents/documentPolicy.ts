import type { UserRole } from '../../types';
import type { DocumentEntityType } from '../../types/documents';

export interface DocumentEntityOption { value:DocumentEntityType; label:string }

const options:DocumentEntityOption[]=[
  {value:'vehicle',label:'Véhicule'}, {value:'customer',label:'Client'},
  {value:'sale',label:'Vente'}, {value:'invoice',label:'Facture'},
  {value:'repair_order',label:'Ordre de réparation'}, {value:'delivery',label:'Livraison'},
  {value:'supplier',label:'Fournisseur'},
];

const policies:Record<DocumentEntityType,UserRole[]>={
  customer:['SUPER_ADMIN','DIRECTION','SALES_MANAGER','SALES_REP','RECEPTIONIST','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_CHIEF','TECHNICIAN','DELIVERY_MANAGER','ACCOUNTANT'],
  vehicle:['SUPER_ADMIN','DIRECTION','SALES_MANAGER','SALES_REP','RECEPTIONIST','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_CHIEF','TECHNICIAN','DELIVERY_MANAGER','PARTS_MANAGER','WAREHOUSE_CLERK'],
  sale:['SUPER_ADMIN','DIRECTION','SALES_MANAGER','SALES_REP','DELIVERY_MANAGER','ACCOUNTANT'],
  invoice:['SUPER_ADMIN','DIRECTION','ACCOUNTANT','SALES_MANAGER','SERVICE_MANAGER'],
  repair_order:['SUPER_ADMIN','DIRECTION','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_CHIEF','TECHNICIAN'],
  delivery:['SUPER_ADMIN','DIRECTION','DELIVERY_MANAGER','SALES_MANAGER','SALES_REP','RECEPTIONIST'],
  supplier:['SUPER_ADMIN','DIRECTION','PARTS_MANAGER','WAREHOUSE_CLERK'],
};

export const documentEntitiesForRoles=(roles:UserRole[])=>options.filter(option=>roles.some(role=>policies[option.value].includes(role)));
export const documentTypesForRoles=(roles:UserRole[])=>{
  const allowed=new Set(documentEntitiesForRoles(roles).map(option=>option.value));
  return ['Carte grise','Pièce d’identité','Permis','Contrat','Devis','Bon de commande','Facture client','Reçu de paiement','Facture fournisseur','Contrôle technique','PV livraison','Justificatif','Autre']
    .filter(type=>type!=='Facture fournisseur'||allowed.has('supplier'));
};
