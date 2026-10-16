import {useMutation,useQuery,useQueryClient}from'@tanstack/react-query';
import{apiRequest}from'../services/apiClient';

export interface TwoFactorStatus{required:boolean;enabled:boolean;superAdmin:boolean;individual:boolean;role:boolean;resetRequired:boolean;enabledAt:string|null;recoveryCodesRemaining:number}
export interface TwoFactorSetup{manualKey:string;qrCodeDataUrl:string;expiresIn:number}
export interface StrongAuthenticationResult{success:boolean;method:'PASSWORD'|'PASSWORD_TOTP';validForSeconds:number}
export interface TwoFactorSecuritySettings{trustedDevicesEnabled:boolean;trustedDevicesDurationDays:number;trustedDevicesMaxDurationDays:number;strongAuthDurationMinutes:number}
export interface TrustedDevice{ id:string;user:{id:string;name:string;email:string;agencyId:string;agencyName:string;concessionId:string;concessionName:string};deviceName:string|null;browserSummary:string|null;createdAt:string;lastUsedAt:string|null;expiresAt:string;revokedAt:string|null;status:'ACTIVE'|'EXPIRED'|'REVOKED';current:boolean }
export interface TrustedDevicePage{items:TrustedDevice[];total:number;page:number;pageSize:number;totalPages:number}
export interface TwoFactorOverview{users?:{total:number;enabled:number;required:number};devices?:{active:number;expired:number;revoked:number};settings?:TwoFactorSecuritySettings}
export interface TwoFactorManagedUser{id:string;fullName:string;email:string;agencyId:string;agencyName:string;enabled:boolean;required:boolean;individualRequired:boolean;resetRequired:boolean}
export interface TwoFactorManagedUserPage{items:TwoFactorManagedUser[];total:number;page:number;pageSize:number;totalPages:number}
export interface TwoFactorRolePolicy{role_id:string;code:string;name:string;is_system:boolean;required:boolean;updated_at:string|null}
const key=['auth','2fa']as const;
export const useMyTwoFactorStatus=(enabled=true)=>useQuery({queryKey:[...key,'me'],queryFn:()=>apiRequest<TwoFactorStatus>('/auth/2fa/status'),enabled});
export const useAdminTwoFactorStatus=(userId?:string,enabled=true)=>useQuery({queryKey:[...key,'user',userId],queryFn:()=>apiRequest<TwoFactorStatus>(`/auth/2fa/users/${userId}`),enabled:enabled&&Boolean(userId)});
export const useTwoFactorRolePolicies=(enabled=true)=>useQuery({queryKey:[...key,'policies'],queryFn:()=>apiRequest<TwoFactorRolePolicy[]>('/auth/2fa/role-policies'),enabled});
export const useTwoFactorSecuritySettings=(enabled=true)=>useQuery({queryKey:[...key,'security-settings'],queryFn:()=>apiRequest<TwoFactorSecuritySettings>('/auth/2fa/security-settings'),enabled});
export const useTwoFactorOverview=(enabled=true)=>useQuery({queryKey:[...key,'security-center','overview'],queryFn:()=>apiRequest<TwoFactorOverview>('/auth/2fa/security-center/overview'),enabled});
export const useTwoFactorManagedUsers=(filters:Record<string,string|number|undefined>,enabled=true)=>{const query=new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==undefined&&value!=='').map(([name,value])=>[name,String(value)]));return useQuery({queryKey:[...key,'security-center','users',filters],queryFn:()=>apiRequest<TwoFactorManagedUserPage>(`/auth/2fa/security-center/users?${query}`),enabled})};
export const useTrustedDevices=(filters:Record<string,string|number|undefined>,personal=false,enabled=true)=>{const query=new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==undefined&&value!=='').map(([name,value])=>[name,String(value)]));return useQuery({queryKey:[...key,'devices',personal?'me':'admin',filters],queryFn:()=>apiRequest<TrustedDevicePage>(`/auth/2fa/devices${personal?'/me':''}?${query}`),enabled})};
export function useTwoFactorActions(){const qc=useQueryClient(),refresh=()=>{void qc.invalidateQueries({queryKey:key});void qc.invalidateQueries({queryKey:['users-admin']})};return{
 setup:useMutation({mutationFn:()=>apiRequest<TwoFactorSetup>('/auth/2fa/setup',{method:'POST',body:'{}'})}),
 confirm:useMutation({mutationFn:(code:string)=>apiRequest<{recoveryCodes:string[]}>('/auth/2fa/confirm',{method:'POST',body:JSON.stringify({code})}),onSuccess:refresh}),
 disable:useMutation({mutationFn:(code:string)=>apiRequest('/auth/2fa/disable',{method:'POST',body:JSON.stringify({code})}),onSuccess:refresh}),
    regenerate:useMutation({mutationFn:(code:string)=>apiRequest<{recoveryCodes:string[]}>('/auth/2fa/recovery/regenerate',{method:'POST',body:JSON.stringify({code})})}),
    stepUp:useMutation({mutationFn:(body:{currentPassword:string;totpCode?:string})=>apiRequest<StrongAuthenticationResult>('/auth/2fa/step-up',{method:'POST',body:JSON.stringify(body)})}),
    enforce:useMutation({mutationFn:({userId,required}:{userId:string;required:boolean})=>apiRequest<TwoFactorStatus>(`/auth/2fa/users/${userId}/requirement`,{method:'PATCH',body:JSON.stringify({required})}),onSuccess:refresh}),
    reset:useMutation({mutationFn:({userId,reason}:{userId:string;reason:string})=>apiRequest(`/auth/2fa/users/${userId}/reset`,{method:'POST',body:JSON.stringify({reason})}),onSuccess:refresh}),
    policy:useMutation({mutationFn:({roleId,required}:{roleId:string;required:boolean})=>apiRequest(`/auth/2fa/role-policies/${roleId}`,{method:'PUT',body:JSON.stringify({required})}),onSuccess:refresh}),
    securitySettings:useMutation({mutationFn:(body:TwoFactorSecuritySettings)=>apiRequest<TwoFactorSecuritySettings>('/auth/2fa/security-settings',{method:'PUT',body:JSON.stringify(body)}),onSuccess:()=>qc.invalidateQueries({queryKey:[...key,'security-settings']})}),
    revokeDevice:useMutation({mutationFn:({id,personal,reason}:{id:string;personal:boolean;reason?:string})=>apiRequest<{success:boolean;current:boolean}>(`/auth/2fa/devices${personal?'/me':''}/${id}`,{method:'DELETE',body:JSON.stringify({reason})}),onSuccess:()=>{void qc.invalidateQueries({queryKey:[...key,'devices']});void qc.invalidateQueries({queryKey:[...key,'security-center','overview']})}}),
    revokeCurrentDevice:useMutation({mutationFn:()=>apiRequest('/auth/2fa/devices/me/current',{method:'DELETE',body:'{}'}),onSuccess:()=>{void qc.invalidateQueries({queryKey:[...key,'devices']});void qc.invalidateQueries({queryKey:[...key,'security-center','overview']})}}),
}}
