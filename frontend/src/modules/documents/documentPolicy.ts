import type { DocumentEntityType } from '../../types/documents';

export interface DocumentEntityOption { value:DocumentEntityType; label:string }

const options:DocumentEntityOption[]=[
  {value:'vehicle',label:'Véhicule'}, {value:'customer',label:'Client'},
  {value:'sale',label:'Vente'}, {value:'invoice',label:'Facture'},
  {value:'repair_order',label:'Ordre de réparation'}, {value:'delivery',label:'Livraison'},
  {value:'supplier',label:'Fournisseur'}, {value:'expense',label:'Dépense'},
  {value:'budget',label:'Budget'}, {value:'employee',label:'Employé'}, {value:'employee_contract',label:'Contrat employé'}, {value:'employee_leave',label:'Congé ou absence'},
  {value:'treasury_manual_operation',label:'Opération manuelle de trésorerie'},
  {value:'budget_expense_disbursement',label:'Décaissement budgétaire'},
];

const policies:Record<DocumentEntityType,string[]>={
  customer:['customers.view'],vehicle:['vehicles.view'],sale:['sales.view'],invoice:['billing.view'],
  repair_order:['service.order.view','workshop.view'],delivery:['delivery.view'],supplier:['parts.suppliers.view'],
  expense:['hr.expense.view','hr.expense.create'],budget:['hr.budget.view'],employee:['hr.employees.view'],employee_contract:['hr.contract.view'],employee_leave:['hr.leave.view'],treasury_manual_operation:['treasury.view'],budget_expense_disbursement:['hr.expense.view'],
};

const has=(permissions:Record<string,unknown>|undefined,code:string)=>Boolean(permissions&&(Object.hasOwn(permissions,'*')||Object.hasOwn(permissions,code)));
export const documentEntitiesForPermissions=(permissions:Record<string,unknown>|undefined)=>options.filter(option=>policies[option.value].some(code=>has(permissions,code)));
export const documentTypesForPermissions=(permissions:Record<string,unknown>|undefined)=>{
  const allowed=new Set(documentEntitiesForPermissions(permissions).map(option=>option.value));
  return ['Carte grise','Pièce d’identité','Permis','Contrat','Devis','Bon de commande','Facture client','Reçu de paiement','Facture fournisseur','Contrôle technique','PV livraison','Justificatif','Autre']
    .filter(type=>type!=='Facture fournisseur'||allowed.has('supplier'));
};
