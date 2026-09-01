import type { PermissionAction, UserRole } from '../types';

export function canAccessModule(role: UserRole, action: PermissionAction, module: string): boolean {
  if (action === 'view' && ['dashboard', 'modules', 'notifications'].includes(module)) return true;
  if (role === 'SUPER_ADMIN' || role === 'DIRECTION') return true;
  switch (role) {
    case 'SALES_MANAGER':
    case 'SALES_REP':
      if (['billing', 'reports', 'crm', 'vehicles', 'sales', 'showroom', 'customers', 'deliveries'].includes(module)) return true;
      if (['service', 'workshop', 'parts'].includes(module)) return action === 'view';
      return false;
    case 'WORKSHOP_CHIEF':
    case 'TECHNICIAN':
    case 'SERVICE_MANAGER':
    case 'SERVICE_ADVISOR':
      if (['service', 'workshop', 'parts', 'vehicles', 'customers'].includes(module)) return true;
      if (module === 'billing') return action === 'view' || action === 'print';
      return false;
    case 'PARTS_MANAGER':
    case 'WAREHOUSE_CLERK': return ['parts', 'vehicles', 'service', 'billing'].includes(module);
    case 'DELIVERY_MANAGER': return ['deliveries', 'vehicles', 'sales', 'customers', 'showroom'].includes(module);
    case 'ACCOUNTANT': return ['billing', 'sales', 'reports', 'customers', 'service'].includes(module);
    case 'RECEPTIONIST': return ['showroom', 'customers', 'crm', 'deliveries', 'vehicles'].includes(module);
    default: return false;
  }
}
