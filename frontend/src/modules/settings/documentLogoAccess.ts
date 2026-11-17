import type { EffectivePermissionScope } from '../../types';

export const canManageDocumentLogo = (scope: EffectivePermissionScope | null | undefined) =>
  scope === 'AGENCY';
