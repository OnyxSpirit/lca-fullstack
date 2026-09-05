import type { PermissionAction, UserRole } from '../types';

function roleAccess(role:UserRole,action:PermissionAction,module:string):boolean {
  if (action === 'view' && ['dashboard', 'modules', 'notifications'].includes(module)) return true;
  if (role === 'SUPER_ADMIN' || role === 'DIRECTION') return true;
  switch (role) {
    case 'SALES_MANAGER':
    case 'SALES_REP':
      if (['billing', 'reports', 'crm', 'vehicles', 'sales', 'showroom', 'customers', 'deliveries', 'documents'].includes(module)) return true;
      if (['service', 'workshop', 'parts'].includes(module)) return action === 'view';
      return false;
    case 'WORKSHOP_CHIEF':
    case 'SERVICE_MANAGER':
      if (['service', 'workshop', 'parts', 'vehicles', 'customers', 'reports', 'documents'].includes(module)) return true;
      if (module === 'billing') return action === 'view' || action === 'print';
      return false;
    case 'TECHNICIAN':
    case 'SERVICE_ADVISOR':
      if (['service', 'workshop', 'parts', 'vehicles', 'customers', 'documents'].includes(module)) return action === 'view' || action === 'create';
      if (module === 'billing') return action === 'view' || action === 'print';
      return false;
    case 'PARTS_MANAGER': return ['parts', 'vehicles', 'service', 'billing', 'reports', 'documents'].includes(module);
    case 'WAREHOUSE_CLERK': return ['parts', 'vehicles', 'service', 'billing', 'documents'].includes(module) && action !== 'delete';
    case 'DELIVERY_MANAGER': return ['deliveries', 'vehicles', 'sales', 'customers', 'showroom', 'documents'].includes(module);
    case 'ACCOUNTANT': return ['billing', 'sales', 'reports', 'customers', 'service', 'documents'].includes(module);
    case 'RECEPTIONIST': return ['showroom', 'customers', 'crm', 'deliveries', 'vehicles', 'documents'].includes(module) && action !== 'delete';
    default: return false;
  }
}

export function canAccessModule(roles:UserRole[]|UserRole,action:PermissionAction,module:string):boolean{return(Array.isArray(roles)?roles:[roles]).some(role=>roleAccess(role,action,module))}
