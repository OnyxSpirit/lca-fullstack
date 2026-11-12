import { create } from 'zustand';
import { User, Agency, PermissionAction, EffectivePermissionScope } from '../types';
import { apiRequest, markAuthSessionBoundary } from '../services/apiClient';
import { disconnectRealtime,refreshRealtimeAgencyContext } from '../services/realtime';
import { hasDynamicPermission } from '../navigation/permissions';
import { clearSessionClientState } from '../services/sessionIsolation';

const AUTH_STORAGE_KEY = 'lca-auth-user';
const ACCESS_TOKEN_KEY = 'lca-access-token';
const REFRESH_TOKEN_KEY = 'lca-refresh-token';

interface AuthState {
  currentUser: User | null;
  currentAgency: Agency | null;
  allUsers: User[];
  allAgencies: Agency[];
  isAuthenticated: boolean;
  pendingTwoFactor: {challengeToken:string;mode:'verify'|'setup';expiresAt:number;trustedDeviceAvailable:boolean;trustedDeviceDurationDays:number}|null;
  pendingAuthenticatedSession: PendingAuthenticatedSession|null;
  login: (email: string, password: string) => Promise<{ success: boolean; next?:'verify'|'setup'; message?: string }>;
  verifyTwoFactor:(code:string,trustDevice?:boolean,deviceName?:string)=>Promise<{success:boolean;message?:string}>;
  recoverTwoFactor:(recoveryCode:string)=>Promise<{success:boolean;message?:string}>;
  beginRequiredTwoFactorSetup:()=>Promise<{manualKey:string;qrCodeDataUrl:string;expiresIn:number}>;
  confirmRequiredTwoFactorSetup:(code:string,trustDevice?:boolean,deviceName?:string)=>Promise<{success:boolean;recoveryCodes?:string[];message?:string}>;
  finishRequiredTwoFactorSetup:()=>void;
  cancelTwoFactorChallenge:()=>void;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  setCurrentAgency: (agency: Agency) => Promise<void>;
  setDirectory: (users: User[], agencies: Agency[]) => void;
  hasPermission: (action: PermissionAction, module: string) => boolean;
  can: (permissionCode: string) => boolean;
  permissionScope: (permissionCode: string) => EffectivePermissionScope | null | undefined;
  refreshPermissions: () => Promise<void>;
}

type AuthProfile = { id: string; firstName: string; lastName: string; email: string; agencyId: string; agencyName: string; agencyCode: string; avatar: string | null; roles: string[]; role: { id: string | null; code: string; isSystemSuperAdmin?: boolean }; permissions: { code: string; scope: EffectivePermissionScope | null }[] };
type AgencyContextResponse={activeAgencyId:string;agencies:{agencyId:string;code:string;name:string;isPrimary:boolean}[];roles:{code:string}[];permissions:{code:string;scope:EffectivePermissionScope|null}[]};
type AuthenticatedResponse={status:'authenticated';accessToken:string;refreshToken:string;user:AuthProfile;recoveryCodes?:string[]};
type LoginResponse=AuthenticatedResponse|{status:'two_factor_required'|'two_factor_setup_required';challengeToken:string;expiresIn:number;trustedDeviceAvailable:boolean;trustedDeviceDurationDays:number};
type PendingAuthenticatedSession={accessToken:string;refreshToken:string;user:User;agency:Agency};
const toUser = (profile: AuthProfile): User => {
  const roles = profile.roles;
  const primaryRole = profile.role.code || roles[0] || '';
  return { id: profile.id, name: `${profile.firstName} ${profile.lastName}`, email: profile.email, role: primaryRole, roles, primaryRole, roleCode: profile.role.code, roleTitle: profile.role.code.replaceAll('_', ' '), avatar: profile.avatar ?? '', agencyId: profile.agencyId, agencyName: profile.agencyName, department: '', phone: '', status: 'active', isSystemSuperAdmin: Boolean(profile.role.isSystemSuperAdmin), permissions: Object.fromEntries(profile.permissions.map(({ code, scope }) => [code, scope])) };
};

const storedUser = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
const parsedUser = (()=>{if(!storedUser)return null;try{const value=JSON.parse(storedUser) as Partial<User>;if(typeof value.id!=='string'||typeof value.role!=='string'||typeof value.agencyId!=='string')throw new Error('Invalid stored user');return value as User}catch{localStorage.removeItem(AUTH_STORAGE_KEY);localStorage.removeItem(ACCESS_TOKEN_KEY);localStorage.removeItem(REFRESH_TOKEN_KEY);return null}})();
const initialUser = parsedUser ? {...parsedUser,roles:parsedUser.roles?.length?parsedUser.roles:[parsedUser.role],primaryRole:parsedUser.primaryRole??parsedUser.role}:null;
const initialAgency: Agency | null = initialUser ? { id: initialUser.agencyId, name: initialUser.agencyName || 'Agence', code: '', city: '', address: '', phone: '', email: '', isMain: true, isActive: true } : null;
export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: initialUser,
  currentAgency: initialAgency,
  allUsers: initialUser ? [initialUser] : [],
  allAgencies: initialAgency ? [initialAgency] : [],
  isAuthenticated: Boolean(initialUser),
  pendingTwoFactor:null,
  pendingAuthenticatedSession:null,

  login: async (email, password) => {
    try {
      const response = await apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if(response.status!=='authenticated'){const next=response.status==='two_factor_required'?'verify':'setup';set({pendingTwoFactor:{challengeToken:response.challengeToken,mode:next,expiresAt:Date.now()+response.expiresIn*1000,trustedDeviceAvailable:Boolean(response.trustedDeviceAvailable),trustedDeviceDurationDays:Number(response.trustedDeviceDurationDays)||7}});return{success:false,next}}
      const user = toUser(response.user);
      const agency: Agency = { id: user.agencyId, name: response.user.agencyName, code: response.user.agencyCode, city: '', address: '', phone: '', email: '', isMain: true, isActive: true };
      markAuthSessionBoundary();
      clearSessionClientState();
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken); localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken); localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      set({ currentUser: user, currentAgency: agency, allUsers: [user], allAgencies: [agency], isAuthenticated: true,pendingTwoFactor:null }); return { success: true };
    } catch (error) { return { success: false, message: error instanceof Error ? error.message : 'Connexion impossible' }; }
  },

  verifyTwoFactor:async(code,trustDevice=false,deviceName)=>{try{const pending=get().pendingTwoFactor;if(!pending||pending.mode!=='verify')throw new Error('Challenge 2FA absent ou expiré.');const response=await apiRequest<AuthenticatedResponse>('/auth/2fa/verify',{method:'POST',body:JSON.stringify({challengeToken:pending.challengeToken,code,trustDevice,deviceName})});const user=toUser(response.user),agency:Agency={id:user.agencyId,name:response.user.agencyName,code:response.user.agencyCode,city:'',address:'',phone:'',email:'',isMain:true,isActive:true};markAuthSessionBoundary();clearSessionClientState();localStorage.setItem(ACCESS_TOKEN_KEY,response.accessToken);localStorage.setItem(REFRESH_TOKEN_KEY,response.refreshToken);localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(user));set({currentUser:user,currentAgency:agency,allUsers:[user],allAgencies:[agency],isAuthenticated:true,pendingTwoFactor:null});return{success:true}}catch(error){return{success:false,message:error instanceof Error?error.message:'Vérification impossible'}}},
  recoverTwoFactor:async(recoveryCode)=>{try{const pending=get().pendingTwoFactor;if(!pending||pending.mode!=='verify')throw new Error('Challenge 2FA absent ou expiré.');const response=await apiRequest<AuthenticatedResponse>('/auth/2fa/recovery',{method:'POST',body:JSON.stringify({challengeToken:pending.challengeToken,recoveryCode})});const user=toUser(response.user),agency:Agency={id:user.agencyId,name:response.user.agencyName,code:response.user.agencyCode,city:'',address:'',phone:'',email:'',isMain:true,isActive:true};markAuthSessionBoundary();clearSessionClientState();localStorage.setItem(ACCESS_TOKEN_KEY,response.accessToken);localStorage.setItem(REFRESH_TOKEN_KEY,response.refreshToken);localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(user));set({currentUser:user,currentAgency:agency,allUsers:[user],allAgencies:[agency],isAuthenticated:true,pendingTwoFactor:null});return{success:true}}catch(error){return{success:false,message:error instanceof Error?error.message:'Récupération impossible'}}},
  beginRequiredTwoFactorSetup:async()=>{const pending=get().pendingTwoFactor;if(!pending||pending.mode!=='setup')throw new Error('Challenge d’enrôlement absent ou expiré.');return apiRequest('/auth/2fa/challenge/setup',{method:'POST',body:JSON.stringify({challengeToken:pending.challengeToken})})},
  confirmRequiredTwoFactorSetup:async(code,trustDevice=false,deviceName)=>{try{const pending=get().pendingTwoFactor;if(!pending||pending.mode!=='setup')throw new Error('Challenge d’enrôlement absent ou expiré.');const response=await apiRequest<AuthenticatedResponse>('/auth/2fa/challenge/confirm',{method:'POST',body:JSON.stringify({challengeToken:pending.challengeToken,code,trustDevice,deviceName})});const user=toUser(response.user),agency:Agency={id:user.agencyId,name:response.user.agencyName,code:response.user.agencyCode,city:'',address:'',phone:'',email:'',isMain:true,isActive:true};set({pendingAuthenticatedSession:{accessToken:response.accessToken,refreshToken:response.refreshToken,user,agency},pendingTwoFactor:null});return{success:true,recoveryCodes:response.recoveryCodes??[]}}catch(error){return{success:false,message:error instanceof Error?error.message:'Activation impossible'}}},
  finishRequiredTwoFactorSetup:()=>{const pending=get().pendingAuthenticatedSession;if(!pending)return;markAuthSessionBoundary();clearSessionClientState();localStorage.setItem(ACCESS_TOKEN_KEY,pending.accessToken);localStorage.setItem(REFRESH_TOKEN_KEY,pending.refreshToken);localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(pending.user));set({currentUser:pending.user,currentAgency:pending.agency,allUsers:[pending.user],allAgencies:[pending.agency],isAuthenticated:true,pendingAuthenticatedSession:null})},
  cancelTwoFactorChallenge:()=>set({pendingTwoFactor:null,pendingAuthenticatedSession:null}),

  logout: () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY),hadStoredSession=Boolean(localStorage.getItem(AUTH_STORAGE_KEY)||localStorage.getItem(ACCESS_TOKEN_KEY)||refreshToken);
    markAuthSessionBoundary();
    if (refreshToken) void apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
    if(hadStoredSession)clearSessionClientState();
    localStorage.removeItem(AUTH_STORAGE_KEY); localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(REFRESH_TOKEN_KEY); disconnectRealtime();
    set({ currentUser: null, currentAgency: null, allUsers: [], allAgencies: [], isAuthenticated: false,pendingTwoFactor:null,pendingAuthenticatedSession:null });
  },

  setCurrentUser: (user) => {
    if (get().currentUser?.id && get().currentUser?.id !== user.id){markAuthSessionBoundary();clearSessionClientState();}
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set({ currentUser: user, currentAgency: get().allAgencies.find((a) => a.id === user.agencyId) ?? get().currentAgency, isAuthenticated: true });
  },

  setCurrentAgency: async (agency) => {
    if(get().currentAgency?.id===agency.id)return;
    const context=await apiRequest<AgencyContextResponse>('/rbac/agency-context',{method:'PUT',body:JSON.stringify({agencyId:agency.id})});
    const selected=context.agencies.find(value=>value.agencyId===context.activeAgencyId);if(!selected)throw new Error('L’agence sélectionnée n’est plus accessible.');
    markAuthSessionBoundary();clearSessionClientState();
    const current=get().currentUser;if(!current)throw new Error('Session utilisateur absente.');const roles=context.roles.map(value=>value.code),user={...current,agencyId:selected.agencyId,agencyName:selected.name,roles,role:roles[0]??'',primaryRole:roles[0]??'',roleCode:roles[0]??'',permissions:Object.fromEntries(context.permissions.map(value=>[value.code,value.scope]))};
    const allAgencies=context.agencies.map(value=>{const known=get().allAgencies.find(item=>item.id===value.agencyId);return known?{...known,name:value.name,code:value.code,isMain:value.isPrimary}:{id:value.agencyId,name:value.name,code:value.code,city:'',address:'',phone:'',email:'',isMain:value.isPrimary,isActive:true}});
    localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(user));set({currentUser:user,currentAgency:allAgencies.find(value=>value.id===selected.agencyId)!,allAgencies});await refreshRealtimeAgencyContext();
  },

  setDirectory: (users, agencies) => set((state) => {const allAgencies=state.allAgencies.map(access=>{const details=agencies.find(agency=>agency.id===access.id);return details?{...details,isMain:access.isMain}:access});return{allUsers:users,allAgencies,currentAgency:allAgencies.find(agency=>agency.id===state.currentUser?.agencyId)??state.currentAgency}}),

  hasPermission: (action, module) => {
    const { currentUser } = get();
    if (!currentUser) return false;
    const dynamicCode = `${module === 'service' ? 'workshop' : module}.${action === 'view' ? 'view' : action}`;
    return hasDynamicPermission(currentUser.permissions,dynamicCode);
  },
  can: (permissionCode) => hasDynamicPermission(get().currentUser?.permissions,permissionCode),
  permissionScope: (permissionCode) => get().currentUser?.permissions?.[permissionCode],
  refreshPermissions: async () => {
    const [{ user: profile },directory] = await Promise.all([apiRequest<{ user: AuthProfile }>('/auth/me'),apiRequest<{activeAgencyId:string;agencies:{agencyId:string;code:string;name:string;isPrimary:boolean}[]}>('/rbac/agencies')]);
    const user = toUser(profile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set((state) => {const accesses=Array.isArray(directory?.agencies)&&directory.agencies.length?directory.agencies:[{agencyId:user.agencyId,name:user.agencyName,code:profile.agencyCode,isPrimary:true}],allAgencies=accesses.map(access=>{const known=state.allAgencies.find(agency=>agency.id===access.agencyId);return known?{...known,name:access.name,code:access.code,isMain:access.isPrimary}:{id:access.agencyId,name:access.name,code:access.code,city:'',address:'',phone:'',email:'',isMain:access.isPrimary,isActive:true}});return{currentUser:user,currentAgency:allAgencies.find(agency=>agency.id===(directory?.activeAgencyId??user.agencyId))??allAgencies[0]!,allAgencies,allUsers:state.allUsers.map(entry=>entry.id===user.id?user:entry)}});
  },
}));
