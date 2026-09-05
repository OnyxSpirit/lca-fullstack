import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient';

export interface AdminUser{id:string;firstName:string;lastName:string;fullName:string;email:string;phone:string|null;jobTitle:string|null;agencyId:string;agencyName:string;roles:string[];isActive:boolean;avatar:string|null;createdAt:string;updatedAt:string}
export interface RolePermission{id:string;module:string;action:string;code:string;description:string|null}
export interface Role{id:string;code:string;name:string;description:string|null;is_system?:boolean;permissions?:RolePermission[]}
export interface UserFilters{active?:''|'true'|'false';agencyId?:string;role?:string;search?:string}
export interface CreateUserPayload{firstName:string;lastName:string;email:string;phone?:string;jobTitle?:string;agencyId:string;roles:string[];password:string}
export type UpdateUserPayload=Omit<CreateUserPayload,'password'>;
export const userKeys={all:['users-admin']as const,detail:(id:string)=>['user',id]as const,directory:['user-directory']as const,roles:['roles']as const};
const params=(f:UserFilters)=>{const p=new URLSearchParams();Object.entries(f).forEach(([k,v])=>{if(v)p.set(k,v)});return p.toString()};
const invalidate=(qc:ReturnType<typeof useQueryClient>)=>{void qc.invalidateQueries({queryKey:userKeys.all});void qc.invalidateQueries({queryKey:['users']});void qc.invalidateQueries({queryKey:userKeys.directory});void qc.invalidateQueries({queryKey:['technicians']})};
export const useUsersAdminQuery=(filters:UserFilters)=>useQuery({queryKey:[...userKeys.all,filters],queryFn:()=>apiRequest<AdminUser[]>(`/users?${params(filters)}`)});
export const useUserQuery=(id?:string)=>useQuery({queryKey:userKeys.detail(id??''),queryFn:()=>apiRequest<AdminUser>(`/users/${id}`),enabled:Boolean(id)});
export const useRolesQuery=()=>useQuery({queryKey:userKeys.roles,queryFn:()=>apiRequest<Role[]>('/roles')});
export const useRolePermissionsQuery=(id?:string)=>useQuery({queryKey:['roles',id,'permissions'],queryFn:()=>apiRequest<Role>(`/roles/${id}/permissions`),enabled:Boolean(id)});
export const useChangeMyPassword=()=>useMutation({mutationFn:(body:{currentPassword:string;newPassword:string})=>apiRequest<{success:boolean}>('/users/me/password',{method:'PATCH',body:JSON.stringify(body)})});
export const useUploadMyAvatar=()=>{const qc=useQueryClient();return useMutation({mutationFn:(file:File)=>{const body=new FormData();body.set('file',file);return apiRequest<AdminUser>('/users/me/avatar',{method:'POST',body})},onSuccess:()=>{void qc.invalidateQueries({queryKey:['user','me']});void qc.invalidateQueries({queryKey:['users']})}})};
export const useDeleteMyAvatar=()=>{const qc=useQueryClient();return useMutation({mutationFn:()=>apiRequest<AdminUser>('/users/me/avatar',{method:'DELETE'}),onSuccess:()=>{void qc.invalidateQueries({queryKey:['user','me']});void qc.invalidateQueries({queryKey:['users']})}})};
export function useUserActions(){const qc=useQueryClient();return{
 create:useMutation({mutationFn:(body:CreateUserPayload)=>apiRequest<AdminUser>('/users',{method:'POST',body:JSON.stringify(body)}),onSuccess:()=>invalidate(qc)}),
 update:useMutation({mutationFn:({id,body}:{id:string;body:UpdateUserPayload})=>apiRequest<AdminUser>(`/users/${id}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:(u)=>{invalidate(qc);void qc.invalidateQueries({queryKey:userKeys.detail(u.id)})}}),
 status:useMutation({mutationFn:({id,isActive}:{id:string;isActive:boolean})=>apiRequest<AdminUser>(`/users/${id}/status`,{method:'PATCH',body:JSON.stringify({isActive})}),onSuccess:()=>invalidate(qc)}),
 resetPassword:useMutation({mutationFn:({id,newPassword}:{id:string;newPassword:string})=>apiRequest(`/users/${id}/password`,{method:'PATCH',body:JSON.stringify({newPassword})})}),
 avatar:useMutation({mutationFn:({id,file}:{id:string;file:File})=>{const body=new FormData();body.set('file',file);return apiRequest<AdminUser>(`/users/${id}/avatar`,{method:'POST',body})},onSuccess:()=>invalidate(qc)}),
 deleteAvatar:useMutation({mutationFn:(id:string)=>apiRequest<AdminUser>(`/users/${id}/avatar`,{method:'DELETE'}),onSuccess:()=>invalidate(qc)})
}}
