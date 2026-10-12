import type{NotificationFilters,NotificationScope}from'../../types/notifications';

export const notificationCategories=[
  ['lead','CRM','crm.prospect.view'],['sale','Ventes','sales.view'],['showroom','Showroom','showroom.view'],
  ['vehicle','Véhicules','vehicles.view'],['repair_order','Atelier','service.order.view'],
  ['delivery','Livraisons','delivery.view'],['invoice','Facturation','billing.view'],['payment','Paiements','billing.view'],
]as const;

export type{NotificationScope};
const scopeRank={OWN:1,AGENCY:2,CONCESSION:3,GLOBAL:4}as const;
export const notificationScopesFor=(permissionScope:string|null|undefined):NotificationScope[]=>{
  const rank=scopeRank[permissionScope as keyof typeof scopeRank]??0,result:NotificationScope[]=[];
  if(rank>0)result.push('mine');if(rank>=2)result.push('agency');if(rank>=3)result.push('concession');if(rank>=4)result.push('global');return result;
};
export const notificationScopeLabels:Record<NotificationScope,string>={mine:'Mes notifications',agency:'Agence',concession:'Concession',global:'Global'};
export const notificationListKey=(userId:string,filters:NotificationFilters)=>['notifications',userId,'list',filters]as const;
