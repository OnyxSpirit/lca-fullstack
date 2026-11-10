import type { AuthUser, RequestAgencyRbacContext, RequestRbacContext } from './index.js';

declare global {
  namespace Express { interface Request { user?: AuthUser; rbac?: RequestRbacContext; agencyRbac?: RequestAgencyRbacContext } }
}
export {};
