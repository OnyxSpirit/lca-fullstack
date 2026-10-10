import type { AuthUser, RequestRbacContext } from './index.js';

declare global {
  namespace Express { interface Request { user?: AuthUser; rbac?: RequestRbacContext } }
}
export {};
