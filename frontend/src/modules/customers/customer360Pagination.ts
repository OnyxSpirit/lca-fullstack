export const CUSTOMER_360_PAGE_SIZES=[7,15,30] as const;

export const CUSTOMER_360_PAGE_KEYS=[
  'timelinePage',
  'opportunitiesPage',
  'vehiclesPage',
  'salesPage',
  'quotationsPage',
  'repairOrdersPage',
  'invoicesPage',
] as const;

export type Customer360PageKey=(typeof CUSTOMER_360_PAGE_KEYS)[number];
export type Customer360Pages=Record<Customer360PageKey,number>;

export const newCustomer360Pages=():Customer360Pages=>Object.fromEntries(CUSTOMER_360_PAGE_KEYS.map(key=>[key,1])) as Customer360Pages;

const collections:ReadonlyArray<[Customer360PageKey,string]>=[
  ['timelinePage','timeline'],
  ['opportunitiesPage','opportunities'],
  ['vehiclesPage','vehicles'],
  ['salesPage','sales'],
  ['quotationsPage','quotations'],
  ['repairOrdersPage','repairOrders'],
  ['invoicesPage','invoices'],
];

export function synchronizeCustomer360Pages(current:Customer360Pages,data:Record<string,unknown>):Customer360Pages{
  let next=current;
  for(const[key,collection]of collections){
    const value=data[collection];
    if(!value||Array.isArray(value)||typeof value!=='object')continue;
    const serverPage=Number((value as{page?:unknown}).page);
    if(!Number.isInteger(serverPage)||serverPage<1||serverPage===current[key])continue;
    if(next===current)next={...current};
    next[key]=serverPage;
  }
  return next;
}
