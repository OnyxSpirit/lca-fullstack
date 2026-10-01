import type { EffectivePermissionScope } from '../../types';

export const canManageDocumentLogo = (scope: EffectivePermissionScope | null | undefined) =>
  scope === 'CONCESSION' || scope === 'GLOBAL';
