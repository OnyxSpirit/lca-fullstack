import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient';

export interface WorkshopRates { T1: number; T2: number; T3: number; T4: number }
export interface ConcessionIdentity { id: string; name: string; legalName: string | null; taxIdentifier: string | null; address: string | null; city: string | null; country: string | null; currencyCode: string; timezone: string }
export interface ConcessionSettings { concession: ConcessionIdentity; billing: { defaultVatRate: number }; workshop: { rates: WorkshopRates } }
export interface SettingsAgency { id: string; concessionId: string; name: string; code: string; address: string | null; city: string | null; phone: string | null; email: string | null; isActive: boolean }
export type AgencyInput = Pick<SettingsAgency, 'name' | 'code'> & Partial<Pick<SettingsAgency, 'address' | 'city' | 'phone' | 'email' | 'concessionId'>>;

const enabled = () => Boolean(localStorage.getItem('lca-access-token'));
export const settingKeys = { settings: ['settings'] as const, identity: ['concession-current'] as const, agencies: ['agencies'] as const, workshop: ['workshop-config'] as const };
const invalidateBusiness = (qc: ReturnType<typeof useQueryClient>) => Promise.all([
  qc.invalidateQueries({ queryKey: settingKeys.settings }),
  qc.invalidateQueries({ queryKey: settingKeys.identity }),
  qc.invalidateQueries({ queryKey: ['billing-config'] }),
  qc.invalidateQueries({ queryKey: settingKeys.workshop }),
]);

export const useSettingsQuery = () => useQuery({ queryKey: settingKeys.settings, queryFn: () => apiRequest<ConcessionSettings>('/settings'), enabled: enabled() });
export const useUpdateSettings = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (body: Pick<ConcessionSettings, 'billing' | 'workshop'>) => apiRequest<ConcessionSettings>('/settings', { method: 'PUT', body: JSON.stringify(body) }), onSuccess: () => invalidateBusiness(qc) }); };
export const useCurrentConcessionQuery = () => useQuery({ queryKey: settingKeys.identity, queryFn: () => apiRequest<ConcessionIdentity>('/concessions/current'), enabled: enabled() });
export const useUpdateConcession = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (body: Omit<ConcessionIdentity, 'id'>) => apiRequest<ConcessionIdentity>('/concessions/current', { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: () => invalidateBusiness(qc) }); };
export const useSettingsAgenciesQuery = () => useQuery({ queryKey: settingKeys.agencies, queryFn: () => apiRequest<SettingsAgency[]>('/agencies'), enabled: enabled() });
export const useCreateAgency = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (body: AgencyInput) => apiRequest<{ agencyId: string }>('/agencies', { method: 'POST', body: JSON.stringify(body) }), onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.agencies }) }); };
export const useUpdateAgency = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...body }: AgencyInput & { id: string }) => apiRequest<{ agencyId: string }>(`/agencies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.agencies }) }); };
export const useUpdateAgencyStatus = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest<{ agencyId: string; isActive: boolean }>(`/agencies/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }), onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.agencies }) }); };
export const useAgencyActions = () => ({ create: useCreateAgency(), update: useUpdateAgency(), status: useUpdateAgencyStatus() });
export const useWorkshopConfigQuery = (agencyId?: string) => useQuery({ queryKey: [...settingKeys.workshop, agencyId ?? 'current'], queryFn: () => apiRequest<{ vatRate: number; currencyCode: string; rates: WorkshopRates }>(`/workshop/config${agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : ''}`), enabled: enabled() });
