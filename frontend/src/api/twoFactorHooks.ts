import {useMutation,useQuery,useQueryClient}from'@tanstack/react-query';
import{apiRequest}from'../services/apiClient';

export interface TwoFactorStatus{required:boolean;enabled:boolean;superAdmin:boolean;individual:boolean;role:boolean;resetRequired:boolean;enabledAt:string|null;recoveryCodesRemaining:number}
export interface TwoFactorSetup{manualKey:string;qrCodeDataUrl:string;expiresIn:number}
export interface StrongAuthenticationResult{success:boolean;method:'PASSWORD'|'PASSWORD_TOTP';validForSeconds:number}
export interface TwoFactorRolePolicy{role_id:string;code:string;name:string;is_system:boolean;required:boolean;updated_at:string|null}
const key=['auth','2fa']as const;
export const useMyTwoFactorStatus=(enabled=true)=>useQuery({queryKey:[...key,'me'],queryFn:()=>apiRequest<TwoFactorStatus>('/auth/2fa/status'),enabled});
export const useAdminTwoFactorStatus=(userId?:string,enabled=true)=>useQuery({queryKey:[...key,'user',userId],queryFn:()=>apiRequest<TwoFactorStatus>(`/auth/2fa/users/${userId}`),enabled:enabled&&Boolean(userId)});
export const useTwoFactorRolePolicies=(enabled=true)=>useQuery({queryKey:[...key,'policies'],queryFn:()=>apiRequest<TwoFactorRolePolicy[]>('/auth/2fa/role-policies'),enabled});
export function useTwoFactorActions(){const qc=useQueryClient(),refresh=()=>{void qc.invalidateQueries({queryKey:key});void qc.invalidateQueries({queryKey:['users-admin']})};return{
 setup:useMutation({mutationFn:()=>apiRequest<TwoFactorSetup>('/auth/2fa/setup',{method:'POST',body:'{}'})}),
 confirm:useMutation({mutationFn:(code:string)=>apiRequest<{recoveryCodes:string[]}>('/auth/2fa/confirm',{method:'POST',body:JSON.stringify({code})}),onSuccess:refresh}),
 disable:useMutation({mutationFn:(code:string)=>apiRequest('/auth/2fa/disable',{method:'POST',body:JSON.stringify({code})}),onSuccess:refresh}),
    regenerate:useMutation({mutationFn:(code:string)=>apiRequest<{recoveryCodes:string[]}>('/auth/2fa/recovery/regenerate',{method:'POST',body:JSON.stringify({code})})}),
    stepUp:useMutation({mutationFn:(body:{currentPassword:string;totpCode?:string})=>apiRequest<StrongAuthenticationResult>('/auth/2fa/step-up',{method:'POST',body:JSON.stringify(body)})}),
    enforce:useMutation({mutationFn:({userId,required}:{userId:string;required:boolean})=>apiRequest<TwoFactorStatus>(`/auth/2fa/users/${userId}/requirement`,{method:'PATCH',body:JSON.stringify({required})}),onSuccess:refresh}),
    reset:useMutation({mutationFn:({userId,reason}:{userId:string;reason:string})=>apiRequest(`/auth/2fa/users/${userId}/reset`,{method:'POST',body:JSON.stringify({reason})}),onSuccess:refresh}),
    policy:useMutation({mutationFn:({roleId,required}:{roleId:string;required:boolean})=>apiRequest(`/auth/2fa/role-policies/${roleId}`,{method:'PUT',body:JSON.stringify({required})}),onSuccess:refresh}),
}}
