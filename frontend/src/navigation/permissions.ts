import type { PermissionAction, User, UserRole } from '../types';

export type ModulePermission = 'dashboard'|'modules'|'crm'|'customers'|'vehicles'|'showroom'|'sales'|'deliveries'|'service'|'workshop'|'parts'|'billing'|'documents'|'notifications'|'reports'|'hr'|'users'|'settings';
export type WorkflowPermission = 'crm.stage.update'|'crm.activity.create'|'crm.close.won'|'crm.close.lost'|'sales.create'|'sales.update'|'sales.cancel'|'showroom.register'|'showroom.assign'|'showroom.cancelWaiting'|'showroom.takeOver'|'showroom.testDrive'|'showroom.returnTestDrive'|'showroom.complete'|'vehicles.create'|'vehicles.update'|'vehicles.viewFinancials'|'customers.create'|'customers.update'|'service.create'|'service.update'|'service.assign'|'service.invoice'|'workshop.manageResources'|'workshop.assign'|'workshop.timeTrack'|'parts.manageCatalog'|'parts.manageStock'|'parts.viewFinancials'|'parts.receive'|'parts.order'|'billing.create'|'billing.pay'|'billing.credit'|'billing.refund'|'deliveries.create'|'deliveries.update'|'deliveries.complete'|'documents.upload'|'documents.archive'|'reports.export'|'users.manage'|'settings.manage';
export type AppPermission = `${ModulePermission}.view`|WorkflowPermission;
export const hasDynamicPermission=(permissions:Record<string,unknown>|undefined,permissionCode:string)=>Boolean(permissions&&(Object.hasOwn(permissions,'*')||Object.hasOwn(permissions,permissionCode)));

const modules=(...values:ModulePermission[]):AppPermission[]=>values.map(value=>`${value}.view` as AppPermission);
const common=modules('dashboard','modules','notifications');

/** Matrice historique conservée pour compatibilité et tests ; le runtime utilise les permissions serveur. */
export const ROLE_PERMISSIONS:Readonly<Record<UserRole,readonly AppPermission[]>>={
  SUPER_ADMIN:[...modules('dashboard','modules','crm','customers','vehicles','showroom','sales','deliveries','service','workshop','parts','billing','documents','notifications','reports','users','settings'),'crm.stage.update','crm.activity.create','crm.close.won','crm.close.lost','sales.create','sales.update','sales.cancel','showroom.register','showroom.assign','showroom.cancelWaiting','showroom.takeOver','showroom.testDrive','showroom.complete','vehicles.create','vehicles.update','vehicles.viewFinancials','customers.create','customers.update','service.create','service.update','service.assign','service.invoice','workshop.manageResources','workshop.assign','workshop.timeTrack','parts.manageCatalog','parts.manageStock','parts.viewFinancials','parts.receive','parts.order','billing.create','billing.pay','billing.credit','billing.refund','deliveries.create','deliveries.update','deliveries.complete','documents.upload','documents.archive','reports.export','users.manage','settings.manage'],
  DIRECTION:[...common,...modules('crm','customers','vehicles','showroom','sales','deliveries','service','workshop','parts','billing','documents','reports','users','settings'),'crm.stage.update','crm.activity.create','crm.close.won','crm.close.lost','sales.create','sales.update','sales.cancel','showroom.register','showroom.assign','showroom.cancelWaiting','showroom.takeOver','showroom.testDrive','showroom.complete','vehicles.create','vehicles.update','vehicles.viewFinancials','customers.create','customers.update','service.create','service.update','service.assign','service.invoice','workshop.manageResources','workshop.assign','workshop.timeTrack','parts.manageCatalog','parts.manageStock','parts.viewFinancials','parts.receive','parts.order','billing.create','billing.pay','billing.credit','billing.refund','deliveries.create','deliveries.update','deliveries.complete','documents.upload','documents.archive','reports.export','users.manage','settings.manage'],
  SALES_MANAGER:[...common,...modules('crm','customers','vehicles','showroom','sales','deliveries','documents','reports'),'crm.stage.update','crm.activity.create','crm.close.won','crm.close.lost','sales.create','sales.update','sales.cancel','showroom.register','showroom.assign','showroom.cancelWaiting','showroom.takeOver','showroom.testDrive','showroom.complete','vehicles.update','vehicles.viewFinancials','customers.create','customers.update','documents.upload','documents.archive','reports.export'],
  SALES_REP:[...common,...modules('crm','customers','vehicles','showroom','sales','deliveries','documents'),'crm.stage.update','crm.activity.create','crm.close.won','crm.close.lost','sales.create','sales.update','showroom.takeOver','showroom.testDrive','showroom.complete','customers.create','customers.update','documents.upload'],
  RECEPTIONIST:[...common,...modules('crm','customers','vehicles','showroom'),'showroom.register','showroom.assign','showroom.cancelWaiting','customers.create'],
  SERVICE_MANAGER:[...common,...modules('customers','vehicles','service','workshop','parts','billing','documents','reports'),'customers.create','customers.update','service.create','service.update','service.assign','service.invoice','workshop.manageResources','workshop.assign','parts.manageStock','documents.upload','documents.archive','reports.export'],
  SERVICE_ADVISOR:[...common,...modules('customers','vehicles','service','workshop','parts','documents'),'customers.create','customers.update','service.create','service.update','workshop.timeTrack','documents.upload'],
  WORKSHOP_CHIEF:[...common,...modules('vehicles','service','workshop','parts','documents','reports','settings'),'service.update','service.assign','service.invoice','workshop.manageResources','workshop.assign','workshop.timeTrack','parts.manageStock','documents.upload','documents.archive','reports.export'],
  TECHNICIAN:[...common,...modules('service','workshop','parts','documents'),'workshop.timeTrack','documents.upload'],
  PARTS_MANAGER:[...common,...modules('service','workshop','parts','documents','reports','settings'),'parts.manageCatalog','parts.manageStock','parts.viewFinancials','parts.receive','parts.order','documents.upload','documents.archive','reports.export'],
  WAREHOUSE_CLERK:[...common,...modules('service','parts','documents'),'parts.manageStock','parts.receive','documents.upload'],
  DELIVERY_MANAGER:[...common,...modules('customers','vehicles','sales','deliveries','documents'),'deliveries.create','deliveries.update','deliveries.complete','documents.upload','documents.archive'],
  ACCOUNTANT:[...common,...modules('customers','sales','billing','documents','reports'),'billing.create','billing.pay','billing.credit','billing.refund','documents.upload','documents.archive','reports.export'],
};

export const BACKEND_ROLE_ALIASES:Readonly<Record<string,UserRole>>={SUPER_ADMIN:'SUPER_ADMIN',DIRECTOR:'DIRECTION',DIRECTION:'DIRECTION',SALES_MANAGER:'SALES_MANAGER',SALES_AGENT:'SALES_REP',SALES_REP:'SALES_REP',RECEPTIONIST:'RECEPTIONIST',SERVICE_MANAGER:'SERVICE_MANAGER',SERVICE_ADVISOR:'SERVICE_ADVISOR',WORKSHOP_MANAGER:'WORKSHOP_CHIEF',WORKSHOP_CHIEF:'WORKSHOP_CHIEF',TECHNICIAN:'TECHNICIAN',PARTS_MANAGER:'PARTS_MANAGER',WAREHOUSE_CLERK:'WAREHOUSE_CLERK',DELIVERY_MANAGER:'DELIVERY_MANAGER',ACCOUNTANT:'ACCOUNTANT'};
export function normalizeRole(role:string):UserRole|null{return BACKEND_ROLE_ALIASES[role]??null}
export function hasPermission(subject:Pick<User,'roles'|'role'>|UserRole[]|UserRole,permission:AppPermission):boolean{const roles=typeof subject==='string'?[subject]:Array.isArray(subject)?subject:subject.roles?.length?subject.roles:[subject.role];if(permission==='showroom.returnTestDrive')return roles.some(role=>['SUPER_ADMIN','DIRECTION','SALES_MANAGER','RECEPTIONIST'].includes(role));return roles.some(role=>ROLE_PERMISSIONS[role]?.includes(permission))}
export function canAccessModule(roles:UserRole[]|UserRole,action:PermissionAction,module:string):boolean{if(action==='view')return hasPermission(roles,`${module}.view` as AppPermission);const aliases:Partial<Record<PermissionAction,WorkflowPermission>>={create:`${module}.create` as WorkflowPermission,update:`${module}.update` as WorkflowPermission,delete:`${module}.archive` as WorkflowPermission,cancel:`${module}.cancel` as WorkflowPermission,export:'reports.export',assign:`${module}.assign` as WorkflowPermission};const permission=aliases[action];return Boolean(permission&&hasPermission(roles,permission))}
export function canPerformWorkflowAction(roles:UserRole[]|UserRole,permission:WorkflowPermission):boolean{return hasPermission(roles,permission)}

const routeModules:ReadonlyArray<[string,ModulePermission]>=[
  ['/service','service'],['/workshop','workshop'],['/deliveries','deliveries'],
  ['/vehicles','vehicles'],['/customers','customers'],['/showroom','showroom'],
  ['/billing','billing'],['/documents','documents'],['/reports','reports'],['/hr','hr'],
  ['/parts','parts'],['/sales','sales'],['/crm','crm'],['/users','users'],
  ['/settings','settings'],['/notifications','notifications'],['/modules','modules'],
  ['/dashboard','dashboard'],
];

export function moduleForRoute(path:string):ModulePermission|null{
  const pathname=path.split(/[?#]/,1)[0]||'';
  return routeModules.find(([root])=>pathname===root||pathname.startsWith(`${root}/`))?.[1]??null;
}

const dynamicModuleCodes:Record<ModulePermission,string>={dashboard:'dashboard.view',modules:'dashboard.view',crm:'crm.prospect.view',customers:'customers.view',vehicles:'vehicles.view',showroom:'showroom.view',sales:'sales.view',deliveries:'delivery.view',service:'service.order.view',workshop:'workshop.view',parts:'parts.view',billing:'billing.view',documents:'ged.view',notifications:'notifications.view',reports:'reporting.view',hr:'hr.view',users:'users.view',settings:'settings.view'};
export function canNavigateWithPermissions(permissions:Record<string,unknown>|undefined,path:string){const module=moduleForRoute(path);return module!==null&&hasDynamicPermission(permissions,dynamicModuleCodes[module])}

export function canNavigateToRoute(roles:UserRole[]|UserRole,path:string):boolean{
  const module=moduleForRoute(path);
  return module!==null&&hasPermission(roles,`${module}.view`);
}

const notificationCategories=[['lead','crm.view'],['sale','sales.view'],['showroom','showroom.view'],['vehicle','vehicles.view'],['repair_order','service.view'],['part','parts.view'],['delivery','deliveries.view'],['invoice','billing.view'],['document','documents.view'],['reservation','sales.view'],['payment','billing.view'],['credit_note','billing.view'],['purchase_order','parts.view'],['customer','customers.view']]as const;
export function visibleNotificationTypes(roles:UserRole[]|UserRole):string[]{return notificationCategories.filter(([,permission])=>hasPermission(roles,permission)).map(([type])=>type)}
