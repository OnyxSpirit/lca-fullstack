import { create } from 'zustand';
import { User, Agency, PermissionAction, EffectivePermissionScope } from '../types';
import { apiRequest } from '../services/apiClient';
import { connectRealtime, disconnectRealtime } from '../services/realtime';
import { hasDynamicPermission } from '../navigation/permissions';

const AUTH_STORAGE_KEY = 'lca-auth-user';
const ACCESS_TOKEN_KEY = 'lca-access-token';
const REFRESH_TOKEN_KEY = 'lca-refresh-token';

interface AuthState {
  currentUser: User | null;
  currentAgency: Agency | null;
  allUsers: User[];
  allAgencies: Agency[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  setCurrentAgency: (agency: Agency) => void;
  setDirectory: (users: User[], agencies: Agency[]) => void;
  hasPermission: (action: PermissionAction, module: string) => boolean;
  can: (permissionCode: string) => boolean;
  permissionScope: (permissionCode: string) => EffectivePermissionScope | null | undefined;
  refreshPermissions: () => Promise<void>;
}

type AuthProfile = { id: string; firstName: string; lastName: string; email: string; agencyId: string; agencyName: string; agencyCode: string; avatar: string | null; roles: string[]; role: { id: string | null; code: string; isSystemSuperAdmin?: boolean }; permissions: { code: string; scope: EffectivePermissionScope | null }[] };
const toUser = (profile: AuthProfile): User => {
  const roles = profile.roles;
  const primaryRole = profile.role.code || roles[0] || '';
  return { id: profile.id, name: `${profile.firstName} ${profile.lastName}`, email: profile.email, role: primaryRole, roles, primaryRole, roleCode: profile.role.code, roleTitle: profile.role.code.replaceAll('_', ' '), avatar: profile.avatar ?? '', agencyId: profile.agencyId, agencyName: profile.agencyName, department: '', phone: '', status: 'active', isSystemSuperAdmin: Boolean(profile.role.isSystemSuperAdmin), permissions: Object.fromEntries(profile.permissions.map(({ code, scope }) => [code, scope])) };
};

const storedUser = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
const parsedUser = storedUser ? JSON.parse(storedUser) as User : null;
const initialUser = parsedUser ? {...parsedUser,roles:parsedUser.roles?.length?parsedUser.roles:[parsedUser.role],primaryRole:parsedUser.primaryRole??parsedUser.role}:null;
const initialAgency: Agency | null = initialUser ? { id: initialUser.agencyId, name: initialUser.agencyName || 'Agence', code: '', city: '', address: '', phone: '', email: '', isMain: true, isActive: true } : null;
export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: initialUser,
  currentAgency: initialAgency,
  allUsers: initialUser ? [initialUser] : [],
  allAgencies: initialAgency ? [initialAgency] : [],
  isAuthenticated: Boolean(initialUser),

  login: async (email, password) => {
    try {
      const response = await apiRequest<{ accessToken: string; refreshToken: string; user: AuthProfile }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      const user = toUser(response.user);
      const agency: Agency = { id: user.agencyId, name: response.user.agencyName, code: response.user.agencyCode, city: '', address: '', phone: '', email: '', isMain: true, isActive: true };
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken); localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken); localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      connectRealtime(response.accessToken); set({ currentUser: user, currentAgency: agency, allUsers: [user], allAgencies: [agency], isAuthenticated: true }); return { success: true };
    } catch (error) { return { success: false, message: error instanceof Error ? error.message : 'Connexion impossible' }; }
  },

  logout: () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY); if (refreshToken) void apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
    localStorage.removeItem(AUTH_STORAGE_KEY); localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(REFRESH_TOKEN_KEY); disconnectRealtime();
    set({ currentUser: null, currentAgency: null, isAuthenticated: false });
  },

  setCurrentUser: (user) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set({ currentUser: user, currentAgency: get().allAgencies.find((a) => a.id === user.agencyId) ?? get().currentAgency, isAuthenticated: true });
  },

  setCurrentAgency: (agency) => set({ currentAgency: agency }),

  setDirectory: (users, agencies) => set((state) => ({ allUsers: users, allAgencies: agencies, currentAgency: agencies.find((a) => a.id === state.currentUser?.agencyId) ?? state.currentAgency })),

  hasPermission: (action, module) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    const dynamicCode = `${module === 'service' ? 'workshop' : module}.${action === 'view' ? 'view' : action}`;
    return hasDynamicPermission(currentUser.permissions,dynamicCode);
  },
  can: (permissionCode) => hasDynamicPermission(get().currentUser?.permissions,permissionCode),
  permissionScope: (permissionCode) => { const permissions = get().currentUser?.permissions; return permissions?.['*'] ?? permissions?.[permissionCode]; },
  refreshPermissions: async () => {
    const { user: profile } = await apiRequest<{ user: AuthProfile }>('/auth/me');
    const user = toUser(profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set((state) => ({ currentUser: user, currentAgency: { id: user.agencyId, name: user.agencyName, code: profile.agencyCode, city: '', address: '', phone: '', email: '', isMain: true, isActive: true }, allUsers: state.allUsers.map((entry) => entry.id === user.id ? user : entry) }));
  },
}));
