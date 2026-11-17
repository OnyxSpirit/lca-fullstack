import{useQuery}from'@tanstack/react-query';
import{apiRequest}from'../services/apiClient';
import type{ReportFilters}from'../types/reports';
export interface FiscalSummary{obligations:number;declaredAmount:number;paidAmount:number;outstandingAmount:number;pendingCount:number;overdueCount:number}
export const useFiscalSummaryQuery=(filters:ReportFilters,enabled=true)=>useQuery({queryKey:['reports','fiscal-summary',filters.from,filters.to,filters.agencyId],queryFn:()=>apiRequest<FiscalSummary>(`/reports/fiscal-summary?${new URLSearchParams({from:filters.from,to:filters.to})}`),enabled:enabled&&Boolean(localStorage.getItem('lca-access-token')),retry:false});
