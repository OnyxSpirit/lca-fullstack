import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';

export interface ConcessionIdentity { id?: string; concessionId?:string; name?:string; tradeName?:string; legalName: string | null; taxIdentifier: string | null; address?: string | null; concessionAddress?:string|null; city?: string | null; concessionCity?:string|null; country: string | null; currencyCode: string; timezone: string; logoMime?:string|null;logoBase64?:string|null }
export interface ConcessionSettings { concession: ConcessionIdentity; billing: { defaultVatRate: number }; workshop: { rates: Record<string,number> } }
export interface SettingsAgency { id: string; concessionId: string; name: string; code: string; address: string | null; city: string | null; phone: string | null; email: string | null; isActive: boolean }
export interface WorkshopLaborRate {id:string;code:string;label:string;concessionHourlyRate:number;isActive:boolean;displayOrder:number;agencyOverride:{id:string;hourlyRate:number;isActive:boolean}|null;effectiveHourlyRate:number;effectiveIsActive:boolean;source:'concession'|'agency'}
export interface WorkshopLaborRatesResponse {agencyId:string;rates:WorkshopLaborRate[]}
export type AgencyInput = Pick<SettingsAgency, 'name' | 'code'> & Partial<Pick<SettingsAgency, 'address' | 'city' | 'phone' | 'email' | 'concessionId'>>;

const enabled = () => Boolean(localStorage.getItem('lca-access-token'));
export const settingKeys = { settings: ['settings'] as const, identity: ['concession-current'] as const, agencies: ['agencies'] as const, workshop: ['workshop-config'] as const };
const invalidateBusiness = (qc: ReturnType<typeof useQueryClient>) => Promise.all([
  qc.invalidateQueries({ queryKey: settingKeys.settings }),
  qc.invalidateQueries({ queryKey: settingKeys.identity }),
  qc.invalidateQueries({ queryKey: ['billing-config'] }),
  qc.invalidateQueries({ queryKey: settingKeys.workshop }),
]);

const useSettingsContext=()=>{const userId=useAuthStore(s=>s.currentUser?.id),agencyId=useAuthStore(s=>s.currentAgency?.id);return{userId,agencyId}};
export const useSettingsQuery = (allowed=true) => {const{userId,agencyId}=useSettingsContext();return useQuery({ queryKey: [...settingKeys.settings,userId,agencyId], queryFn: () => apiRequest<ConcessionSettings>('/settings'), enabled: enabled()&&allowed&&Boolean(userId&&agencyId) });};
export const useUpdateSettings = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (body: {billing:{defaultVatRate:number};workshop?:ConcessionSettings['workshop']}) => apiRequest<ConcessionSettings>('/settings', { method: 'PUT', body: JSON.stringify(body) }), onSuccess: () => invalidateBusiness(qc) }); };
export const useCurrentConcessionQuery = (allowed=true) => {const{userId,agencyId}=useSettingsContext();return useQuery({ queryKey: [...settingKeys.identity,userId,agencyId], queryFn: () => apiRequest<ConcessionIdentity>('/concessions/current'), enabled: enabled()&&allowed&&Boolean(userId&&agencyId) });};
export const useUpdateConcession = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (body: Omit<ConcessionIdentity, 'id'>) => apiRequest<ConcessionIdentity>('/concessions/current', { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: () => invalidateBusiness(qc) }); };
export const useDocumentLogo=()=>{const qc=useQueryClient();const done=()=>invalidateBusiness(qc);return{upload:useMutation({mutationFn:(dataUrl:string)=>apiRequest<ConcessionIdentity>('/concessions/current/document-logo',{method:'PUT',body:JSON.stringify({dataUrl})}),onSuccess:done}),remove:useMutation({mutationFn:()=>apiRequest<ConcessionIdentity>('/concessions/current/document-logo',{method:'DELETE'}),onSuccess:done})}};
export const useSettingsAgenciesQuery = (allowed=true) => {const{userId,agencyId}=useSettingsContext();return useQuery({ queryKey: [...settingKeys.agencies,userId,agencyId], queryFn: () => apiRequest<SettingsAgency[]>('/agencies'), enabled: enabled()&&allowed&&Boolean(userId&&agencyId) });};
export const useCreateAgency = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (body: AgencyInput) => apiRequest<{ agencyId: string }>('/agencies', { method: 'POST', body: JSON.stringify(body) }), onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.agencies }) }); };
export const useUpdateAgency = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...body }: AgencyInput & { id: string }) => apiRequest<{ agencyId: string }>(`/agencies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.agencies }) }); };
export const useUpdateAgencyStatus = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest<{ agencyId: string; isActive: boolean }>(`/agencies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }), onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.agencies }) }); };
export const useAgencyActions = () => ({ create: useCreateAgency(), update: useUpdateAgency(), status: useUpdateAgencyStatus() });
export const useWorkshopLaborRatesQuery=(agencyId?:string,allowed=true)=>{const{userId}=useSettingsContext();return useQuery({queryKey:['workshop-labor-rates',userId,agencyId],queryFn:()=>apiRequest<WorkshopLaborRatesResponse>(`/workshop-labor-rates${agencyId?`?agencyId=${encodeURIComponent(agencyId)}`:''}`),enabled:enabled()&&allowed&&Boolean(userId&&agencyId)})};
const invalidateLaborRates=(qc:ReturnType<typeof useQueryClient>)=>Promise.all([qc.invalidateQueries({queryKey:['workshop-labor-rates']}),qc.invalidateQueries({queryKey:settingKeys.workshop}),qc.invalidateQueries({queryKey:['repair-labor-rates']})]);
export const useWorkshopLaborRateActions=()=>{const qc=useQueryClient(),done=()=>invalidateLaborRates(qc);return{
  create:useMutation({mutationFn:(body:{code:string;label:string;hourlyRate:number;displayOrder:number})=>apiRequest('/workshop-labor-rates',{method:'POST',body:JSON.stringify(body)}),onSuccess:done}),
  update:useMutation({mutationFn:({id,...body}:{id:string;code?:string;label?:string;hourlyRate?:number;isActive?:boolean;displayOrder?:number})=>apiRequest(`/workshop-labor-rates/${id}`,{method:'PATCH',body:JSON.stringify(body)}),onSuccess:done}),
  override:useMutation({mutationFn:({id,...body}:{id:string;agencyId:string;hourlyRate:number;isActive:boolean})=>apiRequest(`/workshop-labor-rates/${id}/agency-override`,{method:'PUT',body:JSON.stringify(body)}),onSuccess:done}),
  clearOverride:useMutation({mutationFn:({id,agencyId}:{id:string;agencyId:string})=>apiRequest(`/workshop-labor-rates/${id}/agency-override?agencyId=${encodeURIComponent(agencyId)}`,{method:'DELETE'}),onSuccess:done}),
}};
export const useWorkshopConfigQuery = (agencyId?: string) => useQuery({ queryKey: [...settingKeys.workshop, agencyId ?? 'current'], queryFn: () => apiRequest<{ vatRate: number; currencyCode: string; rates: Array<{id:string;baseRateId:string;code:string;label:string;hourlyRate:number;source:'concession'|'agency'}> }>(`/workshop/config${agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : ''}`), enabled: enabled() });
