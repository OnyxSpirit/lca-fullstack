export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  modules: '/modules',
  crm: '/crm',
  customers: '/customers',
  vehicles: '/vehicles',
  sales: '/sales',
  showroom: '/showroom',
  deliveries: '/deliveries',
  service: '/service',
  workshop: '/workshop',
  parts: '/parts',
  billing: '/billing',
  reports: '/reports',
  documents: '/documents',
  notifications: '/notifications',
  users: '/users',
  settings: '/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
export type ModuleKey = Exclude<keyof typeof ROUTES, 'login'>;

export const MODULE_ROUTES: ReadonlyArray<{ module: ModuleKey; path: AppRoute }> =
  (Object.entries(ROUTES) as Array<[keyof typeof ROUTES, AppRoute]>)
    .filter(([module]) => module !== 'login')
    .map(([module, path]) => ({ module: module as ModuleKey, path }));

export const detailRoutes = {
  customer: (id: string) => `${ROUTES.customers}/${encodeURIComponent(id)}`,
  vehicle: (id: string) => `${ROUTES.vehicles}/${encodeURIComponent(id)}`,
  sale: (id: string) => `${ROUTES.sales}/${encodeURIComponent(id)}`,
  delivery: (id: string) => `${ROUTES.deliveries}/${encodeURIComponent(id)}`,
  repairOrder: (id: string) => `${ROUTES.service}/repair-orders/${encodeURIComponent(id)}`,
  part: (id: string) => `${ROUTES.parts}/${encodeURIComponent(id)}`,
};

export function notificationRoute(referenceType: string, referenceId: string): string {
  const routes: Record<string, string> = {
    sale: detailRoutes.sale(referenceId),
    delivery: detailRoutes.delivery(referenceId),
    repair_order: detailRoutes.repairOrder(referenceId),
    invoice: ROUTES.billing,
    part: detailRoutes.part(referenceId),
    lead: ROUTES.crm,
    reservation: ROUTES.sales,
    vehicle: detailRoutes.vehicle(referenceId),
  };
  return routes[referenceType] ?? ROUTES.notifications;
}
